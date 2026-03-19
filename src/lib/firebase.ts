import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCIweNp2ICZ0w8zHmJ9Rl4kSfFbRAwZp7Y",
  authDomain: "studentloop-f9f26.firebaseapp.com",
  projectId: "studentloop-f9f26",
  storageBucket: "studentloop-f9f26.firebasestorage.app",
  messagingSenderId: "394179659656",
  appId: "1:394179659656:web:afd482e53f52ad4b049c3d",
  measurementId: "G-4718DHE5HB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
