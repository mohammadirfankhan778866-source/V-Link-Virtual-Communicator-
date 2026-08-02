import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const generateVirtualId = async () => {
  let isUnique = false;
  let newId = '';

  while (!isUnique) {
    const randomNum = Math.floor(1000000 + Math.random() * 9000000).toString();
    newId = `${randomNum.substring(0, 3)}-${randomNum.substring(3)}`;
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('virtualId', '==', newId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      isUnique = true;
    }
  }

  return newId;
};

export const registerUser = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const virtualId = await generateVirtualId();
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      virtualId: virtualId,
      createdAt: new Date()
    });
    return { ...user, virtualId };
  } else {
    return userSnap.data();
  }
};
