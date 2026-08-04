import { collection, doc, setDoc, getDocs, onSnapshot, query, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export const saveContact = async (contactVirtualId, name) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const contactRef = doc(db, 'users', uid, 'contacts', contactVirtualId);
  await setDoc(contactRef, {
    virtualId: contactVirtualId,
    name: name.trim() || `Contact ${contactVirtualId}`,
    savedAt: serverTimestamp()
  }, { merge: true });
};

export const getSavedContacts = async () => {
  if (!auth.currentUser) return [];
  const uid = auth.currentUser.uid;
  const contactsRef = collection(db, 'users', uid, 'contacts');
  const q = query(contactsRef, orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeSavedContacts = (onUpdate) => {
  if (!auth.currentUser) return () => {};
  const uid = auth.currentUser.uid;
  const contactsRef = collection(db, 'users', uid, 'contacts');
  return onSnapshot(contactsRef, (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    onUpdate(list);
  }, (err) => console.log('Contacts listener error:', err));
};

export const deleteContact = async (contactVirtualId) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const contactRef = doc(db, 'users', uid, 'contacts', contactVirtualId);
  await deleteDoc(contactRef);
};
