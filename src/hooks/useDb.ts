"use client";

import { useCallback } from "react";
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
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

// Global cache objects for query deduplication and results caching to optimize performance
const activeQueries: Record<string, Promise<any> | undefined> = {};
const dataCache: Record<string, { data: any[]; timestamp: number } | undefined> = {};
const CACHE_TTL = 10000; // 10 seconds cache time-to-live

// Helper wrapper to add a timeout to Firestore promises
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

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
        await withTimeout(addDoc(auditRef, auditData), 4000, "Tempo limite esgotado ao registrar log de auditoria");
      } catch (err) {
        console.error("Falha ao registrar log de auditoria no Firestore:", err);
      }
    }
  };

  // Helper to invalidate cache for a collection
  const invalidateCache = useCallback((collectionName: string) => {
    const key = `${collectionName}_${tenantId || "shared"}`;
    delete dataCache[key];
    delete activeQueries[key];
  }, [tenantId]);

  // 1. Criar Documento
  const createDoc = useCallback(async (collectionName: string, data: any) => {
    const finalData = injectBaseFields(data, "create");
    invalidateCache(collectionName);

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
    const docRef = await withTimeout(
      addDoc(colRef, finalData),
      5000,
      `Erro ao criar registro em ${collectionName} (Sem resposta do servidor)`
    );
    
    // Registrar log de auditoria
    await logAudit("create", collectionName, docRef.id, null, finalData);
    
    return { id: docRef.id, ...finalData };
  }, [user, tenantId, isMock, invalidateCache]);

  // 2. Atualizar Documento
  const updateDoc = useCallback(async (collectionName: string, docId: string, data: any) => {
    let previousData: any = null;
    invalidateCache(collectionName);

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
    const snap = await withTimeout(
      firestoreGetDoc(docRef),
      4000,
      `Erro ao carregar registro em ${collectionName} para atualização`
    );
    if (!snap.exists()) throw new Error("Documento não encontrado.");
    
    previousData = snap.data();
    const finalData = injectBaseFields(data, "update", previousData);
    
    await withTimeout(
      firestoreUpdateDoc(docRef, finalData),
      5000,
      `Erro ao atualizar registro em ${collectionName} (Sem resposta do servidor)`
    );

    // Registrar log de auditoria
    await logAudit("update", collectionName, docId, previousData, finalData);
    
    return { id: docId, ...finalData };
  }, [user, tenantId, isMock, invalidateCache]);

  // 3. Deletar Documento
  const deleteDoc = useCallback(async (collectionName: string, docId: string) => {
    let previousData: any = null;
    invalidateCache(collectionName);

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
    const snap = await withTimeout(
      firestoreGetDoc(docRef),
      4000,
      `Erro ao buscar registro em ${collectionName} para exclusão`
    );
    if (!snap.exists()) throw new Error("Documento não encontrado.");
    
    previousData = snap.data();
    await withTimeout(
      firestoreDeleteDoc(docRef),
      5000,
      `Erro ao deletar registro em ${collectionName} (Sem resposta do servidor)`
    );

    // Registrar log de auditoria
    await logAudit("delete", collectionName, docId, previousData, null);
    return true;
  }, [user, tenantId, isMock, invalidateCache]);

  // 4. Obter Todos os Documentos do Tenant (Com cache, deduplicação e resiliência)
  const getDocs = useCallback(async (collectionName: string) => {
    const targetTenant = tenantId || "shared";
    const cacheKey = `${collectionName}_${targetTenant}`;

    // Check in-memory cache
    if (dataCache[cacheKey] && (Date.now() - dataCache[cacheKey].timestamp < CACHE_TTL)) {
      return dataCache[cacheKey].data || [];
    }

    // Check if there is already an active promise for this request
    if (activeQueries[cacheKey]) {
      try {
        const cachedRes = await activeQueries[cacheKey];
        return Array.isArray(cachedRes) ? cachedRes : [];
      } catch (err) {
        delete activeQueries[cacheKey];
      }
    }

    // Define query promise
    const fetchPromise = (async () => {
      try {
        if (isMock) {
          const storageKey = `mock_db_${collectionName}`;
          const existing = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
          const list = existing ? JSON.parse(existing) : [];
          return Array.isArray(list) ? list.filter((item: any) => item && item.tenantId === targetTenant) : [];
        }

        // Firestore real
        const colRef = collection(db, collectionName);
        const q = query(
          colRef, 
          where("tenantId", "==", targetTenant)
        );
        const snap = await withTimeout(
          firestoreGetDocs(q),
          5500,
          `Erro ao buscar lista de ${collectionName} (Sem resposta do servidor)`
        );
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn(`[useDb] Falha ao carregar ${collectionName}:`, err);
        return [];
      }
    })();

    // Prevent unhandled promise rejection warnings on activeQueries map
    fetchPromise.catch(() => {});
    activeQueries[cacheKey] = fetchPromise;

    try {
      const data = await fetchPromise;
      const safeData = Array.isArray(data) ? data : [];
      dataCache[cacheKey] = {
        data: safeData,
        timestamp: Date.now()
      };
      return safeData;
    } catch (err) {
      console.warn(`[useDb] Exceção em getDocs (${collectionName}):`, err);
      return [];
    } finally {
      delete activeQueries[cacheKey];
    }
  }, [tenantId, isMock]);

  // 5. Obter Documento por ID (Com cache simples e resiliência)
  const getDocById = useCallback(async (collectionName: string, docId: string) => {
    try {
      if (isMock) {
        const storageKey = `mock_db_${collectionName}`;
        const existing = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
        if (!existing) return null;
        const list = JSON.parse(existing);
        return list.find((item: any) => item && item.id === docId) || null;
      }

      // Firestore real
      const docRef = doc(db, collectionName, docId);
      const snap = await withTimeout(
        firestoreGetDoc(docRef),
        5000,
        `Erro ao buscar registro por ID em ${collectionName}`
      );
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    } catch (err) {
      console.warn(`[useDb] Falha ao carregar documento ${collectionName}/${docId}:`, err);
      return null;
    }
  }, [isMock]);

  return {
    createDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDocById,
    invalidateCache
  };
}
