import type { FirebaseOptions } from "firebase/app";

// Configuración web de Firebase. Es pública (viaja dentro de la app): lo que
// protege los datos son las reglas de Firestore (cada usuario solo lee y escribe
// users/{su uid}). null = sin login; la app funciona igual, solo en el dispositivo.
// Sin measurementId a propósito: la app no usa Analytics.
export const FIREBASE_CONFIG: FirebaseOptions | null = {
  apiKey: "AIzaSyC48d88vkn7GdXJJQGc2iWIWcrUzoZEtgM",
  authDomain: "viajes-15a78.firebaseapp.com",
  projectId: "viajes-15a78",
  storageBucket: "viajes-15a78.firebasestorage.app",
  messagingSenderId: "524746497751",
  appId: "1:524746497751:web:f28b0b9bf81e1b9ee4da92",
};
