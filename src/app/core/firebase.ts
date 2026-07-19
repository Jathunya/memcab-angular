import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase Web SDK config — these values are not secret; Firebase's real
// security boundary is Firestore/Storage security rules, not this key.
const firebaseConfig = {
  apiKey: 'AIzaSyBGn8Da2Uu26jOPxS1F0y40r80H_ButVIQ',
  authDomain: 'memcab-19762.firebaseapp.com',
  projectId: 'memcab-19762',
  storageBucket: 'memcab-19762.firebasestorage.app',
  messagingSenderId: '209069290797',
  appId: '1:209069290797:web:4fd7e906e307d919854fa4',
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
