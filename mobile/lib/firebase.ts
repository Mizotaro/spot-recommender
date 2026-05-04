import { getApps, getApp, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDrktr_jQnSRjEwI0gVNXJ9VHRdGWFgJXY',
  authDomain: 'spot-recommender-50536.firebaseapp.com',
  projectId: 'spot-recommender-50536',
  storageBucket: 'spot-recommender-50536.firebasestorage.app',
  messagingSenderId: '677494767981',
  appId: '1:677494767981:web:5de39646917b2ec508da64',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
