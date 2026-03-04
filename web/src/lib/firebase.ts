import { initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCxLFJ1aLyYlAaMQsVZ37e-OgMFgjar8W8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bedelia-isef.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bedelia-isef",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bedelia-isef.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let firebaseAuth: Auth | null = null;
let firebaseInitError = "";

try {
  const firebaseApp = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
} catch (error) {
  firebaseInitError = error instanceof Error ? error.message : "No se pudo inicializar Firebase";
}

export { firebaseAuth, firebaseInitError };
