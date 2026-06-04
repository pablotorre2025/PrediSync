import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyBAvFtYjRMMGCccaE2ZPvzqBPB54J0tKW4',
  authDomain: 'sermon-maker-pro.firebaseapp.com',
  projectId: 'sermon-maker-pro',
  storageBucket: 'sermon-maker-pro.firebasestorage.app',
  messagingSenderId: '751573116871',
  appId: '1:751573116871:web:63b1d8831949af9650dbe2'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Habilitar caché offline persistente
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch {
  db = getFirestore(app);
}
export { db };
export const storage = getStorage(app);
