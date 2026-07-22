import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "carol-ramos-collection-erp";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Inicialização segura do Firebase Admin SDK com suporte a HMR
const adminApp = getApps().length === 0
  ? (clientEmail && privateKey && !privateKey.includes("YOUR-PRIVATE-KEY")
      ? initializeApp({
          credential: cert({
            projectId: "carol-ramos-collection-erp",
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, "\n"),
          }),
        })
      : initializeApp({
          projectId: "carol-ramos-collection-erp",
        }))
  : getApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;
