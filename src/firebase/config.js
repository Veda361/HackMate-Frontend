import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyC3Qkx6kwBlRbS7epEa2PMNNQm0axDBHyw",
  authDomain: "hackmate-157ef.firebaseapp.com",
  projectId: "hackmate-157ef",
  storageBucket: "hackmate-157ef.firebasestorage.app",
  messagingSenderId: "519681923763",
  appId: "1:519681923763:web:bfb0ac61899c747af52ec6",
};

export const app = initializeApp(firebaseConfig); // ✅ ADD export