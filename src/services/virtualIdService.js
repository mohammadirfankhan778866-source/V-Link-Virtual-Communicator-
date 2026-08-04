import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Deterministic 10-digit ID generator for fallback/recovery
const getDeterministic10DigitId = (uid, email, customVirtualId) => {
  if (customVirtualId && customVirtualId.replace(/\D/g, '').length === 10) {
    return customVirtualId.replace(/\D/g, '');
  }
  const extractedPhone = email ? email.split('@')[0].replace(/\D/g, '') : '';
  if (extractedPhone.length === 10) {
    return extractedPhone;
  }
  let hash = 0;
  const str = uid || 'default_user';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash) % 9000000000 + 1000000000;
  return positiveHash.toString();
};

export const generateVirtualId = async () => {
  let isUnique = false;
  let newId = '';
  let attempts = 0;

  while (!isUnique && attempts < 5) {
    attempts++;
    const random10 = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    newId = random10;
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('virtualId', '==', newId));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        isUnique = true;
      }
    } catch (err) {
      console.warn('Error checking virtualId uniqueness:', err);
      isUnique = true; // Fallback
    }
  }

  return newId || Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

export const registerUser = async (user, customVirtualId = null, customDisplayName = null) => {
  if (!user || !user.uid) return null;

  const deterministicId = getDeterministic10DigitId(user.uid, user.email, customVirtualId);

  try {
    const userRef = doc(db, 'users', user.uid);

    // Timeout getDoc so sign in never gets stuck if Firestore is slow
    const getDocWithTimeout = Promise.race([
      getDoc(userRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000))
    ]);

    let userSnap;
    try {
      userSnap = await getDocWithTimeout;
    } catch (timeoutErr) {
      console.warn('Firestore fetch timed out, creating local user state:', timeoutErr);
      return {
        uid: user.uid,
        displayName: customDisplayName || user.displayName || `User ${deterministicId.slice(-4)}`,
        email: user.email || `${deterministicId}@voipapp.com`,
        virtualId: deterministicId,
        photoURL: user.photoURL || null,
        createdAt: new Date()
      };
    }

    if (!userSnap.exists()) {
      let virtualId = customVirtualId;
      if (!virtualId) {
        const extractedPhone = user.email ? user.email.split('@')[0].replace(/\D/g, '') : '';
        if (extractedPhone.length === 10) {
          virtualId = extractedPhone;
        } else {
          virtualId = await generateVirtualId();
        }
      }

      const userData = {
        uid: user.uid,
        displayName: customDisplayName || user.displayName || `User ${virtualId.slice(-4)}`,
        email: user.email || `${virtualId}@voipapp.com`,
        photoURL: user.photoURL || null,
        virtualId: virtualId,
        createdAt: new Date()
      };

      await setDoc(userRef, userData, { merge: true });
      return userData;
    } else {
      const existingData = userSnap.data();
      // If existing user has legacy short virtualId, update it to 10 digits
      if (!existingData.virtualId || existingData.virtualId.replace(/\D/g, '').length < 10) {
        const updated10DigitId = customVirtualId || deterministicId;
        const updatedData = { ...existingData, virtualId: updated10DigitId };
        await setDoc(userRef, updatedData, { merge: true });
        return updatedData;
      }
      return existingData;
    }
  } catch (error) {
    console.error('Error in registerUser:', error);
    return {
      uid: user.uid,
      displayName: customDisplayName || user.displayName || 'VoIP User',
      email: user.email || 'user@voipapp.com',
      virtualId: deterministicId
    };
  }
};

