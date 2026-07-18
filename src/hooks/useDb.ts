"use client";

import { useAuth } from "@/context/AuthContext";
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc as firestoreUpdateDoc, 
  deleteDoc as firestoreDeleteDoc, 
  getDocs as firestoreGetDocs, 
  getDoc as firestoreGetDoc, 
  query, 
  where,
  Timestamp,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export function useDb() {
  const { user, tenantId, isMock } = useAuth();

  // Helper para injetar metadados base
  const injectBaseFields = (data: any, action: "create" | "update", previousData?: any) => {
    const now = isMock ? new Date().toISOString() : Timestamp.now();
    const userId = user?.uid || "unknown";
    
    if (action === "create") {
      return {
        ...data,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
        tenantId: tenantId || "shared",
      };
    } else {
      return {
        ...data,
        createdAt: previousData?.createdAt || now,
        updatedAt: now,
        createdBy: previousData?.createdBy || userId,
        updatedBy: userId,
        tenantId: tenantId || "shared",
      };
    }
  };

  // Helper para criar log de auditoria
  const logAudit = async (
    action: "create" | "update" | "delete",
    collectionName: string,
    docId: string,
    previousValues?: any,
    newValues?: any
  ) => {
    const userId = user?.uid || "unknown";
    const userEmail = user?.email || "unknown";
    const now = isMock ? new Date().toISOString() : Timestamp.now();

    const auditData = {
      tenantId: tenantId || "shared",
      userId,
      userEmail,
      action,
      collection: collectionName,
      documentId: docId,
      previousValues: previousValues || null,
      newValues: newValues || null,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    if (isMock) {
      const mockAudits = localStorage.getItem("mock_db_audit_logs");
      const list = mockAudits ? JSON.parse(mockAudits) : [];
      const newAudit = { id: `audit-${Math.random().toString(36).substr(2, 9)}`, ...auditData };
      list.push(newAudit);
      localStorage.setItem("mock_db_audit_logs", JSON.stringify(list));
    } else {
      try {
        const auditRef = collection(db, "audit_logs");
        await addDoc(auditRef, auditData);
      } catch (err) {
        console.error("Falha ao registrar log de auditoria no Firestore:", err);
      }
    }
  };

  // 1. Criar Documento
  const createDoc = async (collectionName: string, data: any) => {
    const finalData = injectBaseFields(data, "create");

    if (isMock) {
      const storageKey = `mock_db_${collectionName}`;
      const existing = localStorage.getItem(storageKey);
      const list = existing ? JSON.parse(existing) : [];
      
      const newDoc = {
        id: `${collectionName.substring(0, 3)}-${Math.random().toString(36).substr(2, 9)}`,
        ...finalData,
      };
      
      list.push(newDoc);
      localStorage.setItem(storageKey, JSON.stringify(list));
      
      // Registrar log de auditoria
      await logAudit("create", collectionName, newDoc.id, null, finalData);
      
      return newDoc;
    }

    // Firestore real
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, finalData);
    
    // Registrar log de auditoria
    await logAudit("create", collectionName, docRef.id, null, finalData);
    
    return { id: docRef.id, ...finalData };
  };

  // 2. Atualizar Documento
  const updateDoc = async (collectionName: string, docId: string, data: any) => {
    let previousData: any = null;

    if (isMock) {
      const storageKey = `mock_db_${collectionName}`;
      const existing = localStorage.getItem(storageKey);
      if (!existing) throw new Error("Documento não encontrado.");
      
      const list = JSON.parse(existing);
      const idx = list.findIndex((item: any) => item.id === docId);
      if (idx === -1) throw new Error("Documento não encontrado.");

      previousData = list[idx];
      const finalData = injectBaseFields(data, "update", previousData);
      
      list[idx] = { id: docId, ...finalData };
      localStorage.setItem(storageKey, JSON.stringify(list));

      // Registrar log de auditoria
      await logAudit("update", collectionName, docId, previousData, finalData);
      
      return list[idx];
    }

    // Firestore real
    const docRef = doc(db, collectionName, docId);
    const snap = await firestoreGetDoc(docRef);
    if (!snap.exists()) throw new Error("Documento não encontrado.");
    
    previousData = snap.data();
    const finalData = injectBaseFields(data, "update", previousData);
    
    await firestoreUpdateDoc(docRef, finalData);

    // Registrar log de auditoria
    await logAudit("update", collectionName, docId, previousData, finalData);
    
    return { id: docId, ...finalData };
  };

  // 3. Deletar Documento
  const deleteDoc = async (collectionName: string, docId: string) => {
    let previousData: any = null;

    if (isMock) {
      const storageKey = `mock_db_${collectionName}`;
      const existing = localStorage.getItem(storageKey);
      if (!existing) throw new Error("Documento não encontrado.");
      
      const list = JSON.parse(existing);
      const idx = list.findIndex((item: any) => item.id === docId);
      if (idx === -1) throw new Error("Documento não encontrado.");

      previousData = list[idx];
      list.splice(idx, 1);
      localStorage.setItem(storageKey, JSON.stringify(list));

      // Registrar log de auditoria
      await logAudit("delete", collectionName, docId, previousData, null);
      return true;
    }

    // Firestore real
    const docRef = doc(db, collectionName, docId);
    const snap = await firestoreGetDoc(docRef);
    if (!snap.exists()) throw new Error("Documento não encontrado.");
    
    previousData = snap.data();
    await firestoreDeleteDoc(docRef);

    // Registrar log de auditoria
    await logAudit("delete", collectionName, docId, previousData, null);
    return true;
  };

  // 4. Obter Todos os Documentos do Tenant
  const getDocs = async (collectionName: string) => {
    if (isMock) {
      const storageKey = `mock_db_${collectionName}`;
      const existing = localStorage.getItem(storageKey);
      const list = existing ? JSON.parse(existing) : [];
      // Filtrar por tenantId
      const targetTenant = tenantId || "shared";
      return list.filter((item: any) => item.tenantId === targetTenant);
    }

    // Firestore real
    const colRef = collection(db, collectionName);
    const q = query(
      colRef, 
      where("tenantId", "==", tenantId || "shared")
    );
    const snap = await firestoreGetDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  // 5. Obter Documento por ID
  const getDocById = async (collectionName: string, docId: string) => {
    if (isMock) {
      const storageKey = `mock_db_${collectionName}`;
      const existing = localStorage.getItem(storageKey);
      if (!existing) return null;
      const list = JSON.parse(existing);
      return list.find((item: any) => item.id === docId) || null;
    }

    // Firestore real
    const docRef = doc(db, collectionName, docId);
    const snap = await firestoreGetDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  };

  return {
    createDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDocById,
  };
}
