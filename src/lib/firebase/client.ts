import { getApps, initializeApp, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "carol-ramos-collection-erp.firebaseapp.com";
const projectId = "carol-ramos-collection-erp";
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "carol-ramos-collection-erp.firebasestorage.app";
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012";
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:carolramoscollectionerp";

// Validação de chaves de placeholder do Firebase
export const isFirebasePlaceholderKey = !apiKey || apiKey === "your-api-key-here" || apiKey === "dummy-api-key";

if (isFirebasePlaceholderKey) {
  console.warn("⚠️ [Firebase Client] API Key do Firebase não configurada em .env.local.");
}

const firebaseConfig = {
  apiKey: apiKey || "AIzaSy_CarolRamosCollectionERP_Key",
  authDomain,
  projectId: "carol-ramos-collection-erp",
  storageBucket,
  messagingSenderId,
  appId,
};

// Inicialização única do Firebase App para o projeto real carol-ramos-collection-erp
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
