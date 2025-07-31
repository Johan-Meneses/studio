// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: 'budgetview-7jn65',
  appId: '1:930824382242:web:c54a727c6d8462d0f6e77b',
  storageBucket: 'budgetview-7jn65.firebasestorage.app',
  apiKey: 'AIzaSyA665FU0Hg-0evD3zHlgOVx3OtBfXf-ge4',
  authDomain: 'budgetview-7jn65.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '930824382242',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
