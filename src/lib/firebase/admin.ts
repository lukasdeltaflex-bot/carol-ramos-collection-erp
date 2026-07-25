import { initializeApp, getApps, getApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let _adminApp: App | undefined;

function getAdminApp(): App {
  if (_adminApp) return _adminApp;
  
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "carol-ramos-collection-erp";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  try {
    let formattedKey = privateKey;
    if (formattedKey) {
      if ((formattedKey.startsWith('"') && formattedKey.endsWith('"')) || (formattedKey.startsWith("'") && formattedKey.endsWith("'"))) {
        formattedKey = formattedKey.slice(1, -1);
      }
      formattedKey = formattedKey.replace(/\\n/g, "\n").replace(/\\r/g, "");
    }

    _adminApp = getApps().length === 0
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
    _adminApp = getApps().length > 0 ? getApp() : initializeApp({ projectId: projectId });
  }

  return _adminApp;
}

// Inicialização Lazy usando Proxy para evitar quebras no module-load na Vercel
export const adminDb = new Proxy({} as unknown as Firestore, {
  get: (_, prop) => Reflect.get(getFirestore(getAdminApp()), prop)
});

export default new Proxy({} as App, {
  get: (_, prop) => Reflect.get(getAdminApp(), prop)
});
