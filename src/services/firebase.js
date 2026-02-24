import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Usa getFirestore padrão — robusto e sem risco de corrupção do IndexedDB
export const db = getFirestore(app);

// Habilita persistência offline com fallback silencioso
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
        console.warn("Firestore: múltiplas abas abertas — persistência offline desabilitada nesta aba.");
    } else if (err.code === "unimplemented") {
        console.warn("Firestore: navegador não suporta persistência offline.");
    } else {
        console.warn("Firestore: falha ao habilitar persistência offline:", err.message);
    }
});

// Analytics pode falhar em alguns navegadores/ambientes
export let analytics = null;
try {
    analytics = getAnalytics(app);
} catch (e) {
    console.warn("Firebase Analytics não inicializado:", e.message);
}
