import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "carol-ramos-collection-erp";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Inicialização segura do Firebase Admin SDK com suporte a HMR
let adminApp;
try {
  let formattedKey = privateKey;
  if (formattedKey) {
    // Vercel pode injetar aspas em volta da chave ou literal \n
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
      formattedKey = formattedKey.slice(1, -1);
    }
    formattedKey = formattedKey.replace(/\\n/g, "\n");
  }

  adminApp = getApps().length === 0
    ? (clientEmail && formattedKey && !formattedKey.includes("YOUR-PRIVATE-KEY")
        ? initializeApp({
            credential: cert({
              projectId: projectId,
              clientEmail,
              privateKey: formattedKey,
            }),
          })
        : initializeApp({
            projectId: projectId,
          }))
    : getApp();
} catch (error) {
  console.error("[Firebase Admin Error] Falha na inicialização:", error);
  // Inicialização de fallback vazia para não quebrar o load do módulo
  adminApp = getApps().length > 0 ? getApp() : initializeApp({ projectId: projectId });
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;
