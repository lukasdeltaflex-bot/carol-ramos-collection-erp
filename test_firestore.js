const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getAuth } = require("firebase-admin/auth");

try {
  const adminApp = initializeApp({ projectId: "test-project" });
  console.log("App initialized");
  const db = getFirestore(adminApp);
  console.log("Firestore initialized successfully");
  const storage = getStorage(adminApp);
  console.log("Storage initialized successfully");
  const auth = getAuth(adminApp);
  console.log("Auth initialized successfully");
} catch (e) {
  console.error("Error initializing:", e.message);
}
