import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAMA5HqQsBsRBLOaqD9M-VNhnKVegbjkSQ",
  authDomain: "charismatic-intelligence-s6shk.firebaseapp.com",
  projectId: "charismatic-intelligence-s6shk",
  storageBucket: "charismatic-intelligence-s6shk.firebasestorage.app",
  messagingSenderId: "626478737732",
  appId: "1:626478737732:web:46593bfb6e25dfbd654f11"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = initializeFirestore(app, {}, "ai-studio-vlinkvirtualcomm-c358f7cc-3850-4155-b156-dbdc7253724c");

export { auth, db };
