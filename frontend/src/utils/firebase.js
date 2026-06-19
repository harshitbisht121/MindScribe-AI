import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBGQ8YbYIA7xtSQCnai5kJAnuBycluH4G0",
  authDomain: "mindscribe-ai-87a12.firebaseapp.com",
  projectId: "mindscribe-ai-87a12",
  storageBucket: "mindscribe-ai-87a12.firebasestorage.app",
  messagingSenderId: "662652019846",
  appId: "1:662652019846:web:06f0641e8e05d6b31a5d07",
  measurementId: "G-1836SDEJKS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
