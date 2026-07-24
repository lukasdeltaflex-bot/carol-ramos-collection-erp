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
    // Remove aspas simples ou duplas do início e do fim
    if ((formattedKey.startsWith('"') && formattedKey.endsWith('"')) || (formattedKey.startsWith("'") && formattedKey.endsWith("'"))) {
      formattedKey = formattedKey.slice(1, -1);
    }
    // Substitui caracteres de escape por novas linhas reais e remove \r
    formattedKey = formattedKey.replace(/\\n/g, "\n").replace(/\\r/g, "");
  }

  adminApp = getApps().length === 0
    ? (clientEmail && formattedKey && formattedKey.length > 10 && !formattedKey.includes("YOUR-PRIVATE-KEY")
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
  console.error("[Firebase Admin Error] Falha na inicialização com credenciais. Usando fallback seguro:", error);
  // Inicialização de fallback vazia para não quebrar o load do módulo, permitindo a rota subir
  adminApp = getApps().length > 0 ? getApp() : initializeApp({ projectId: projectId });
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;
