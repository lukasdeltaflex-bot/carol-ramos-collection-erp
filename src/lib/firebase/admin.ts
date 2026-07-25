import { initializeApp, getApps, getApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let _adminApp: App | undefined;

function getAdminApp(): App {
  if (_adminApp) return _adminApp;
  
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "carol-ramos-collection-erp";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  try {
    let formattedKey: string = privateKey || "";
    if (formattedKey) {
      formattedKey = formattedKey.trim();
      // Caso o usuário tenha colado o JSON inteiro por engano na Vercel
      if (formattedKey.startsWith("{") && formattedKey.endsWith("}")) {
        try {
          const jsonData = JSON.parse(formattedKey);
          if (typeof jsonData.private_key === "string") {
            formattedKey = jsonData.private_key;
          }
        } catch (_) {}
      }
      // Remove aspas nas pontas se existirem
      if ((formattedKey.startsWith('"') && formattedKey.endsWith('"')) || (formattedKey.startsWith("'") && formattedKey.endsWith("'"))) {
        formattedKey = formattedKey.slice(1, -1);
      }
      // Substitui \n literal por quebra de linha real
      formattedKey = formattedKey.replace(/\\n/g, "\n").replace(/\\r/g, "");

      // Normalização Ultra-Resiliente do PEM:
      // Constrói um PEM perfeito independentemente de como a chave foi colada (com espaços, em uma linha só, etc.)
      const beginHeader = "-----BEGIN PRIVATE KEY-----";
      const endHeader = "-----END PRIVATE KEY-----";
      if (formattedKey.includes(beginHeader) && formattedKey.includes(endHeader)) {
        const base64Body = formattedKey
          .substring(formattedKey.indexOf(beginHeader) + beginHeader.length, formattedKey.indexOf(endHeader))
          .replace(/\s+/g, ""); // Remove todos os espaços e quebras incorretas do meio do base64
        
        const pemLines = base64Body.match(/.{1,64}/g) || [];
        formattedKey = `${beginHeader}\n${pemLines.join("\n")}\n${endHeader}\n`;
      }
    }

    if (!clientEmail || !formattedKey || formattedKey.length <= 10 || formattedKey.includes("YOUR-PRIVATE-KEY")) {
      throw new Error("Credenciais do Firebase ausentes ou inválidas no process.env (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)");
    }

    _adminApp = getApps().length === 0
      ? initializeApp({
          credential: cert({
            projectId: projectId,
            clientEmail,
            privateKey: formattedKey,
          }),
        })
      : getApp();
  } catch (error) {
    console.error("[Firebase Admin Error] Falha na inicialização com credenciais:", error);
    throw error;
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
