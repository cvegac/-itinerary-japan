import type { FirebaseOptions } from "firebase/app";

// Configuración web de Firebase. Es pública (viaja dentro de la app): lo que
// protege los datos son las reglas de Firestore (cada usuario solo lee y escribe
// users/{su uid}). null = sin login; la app funciona igual, solo en el dispositivo.
export const FIREBASE_CONFIG: FirebaseOptions | null = null;
