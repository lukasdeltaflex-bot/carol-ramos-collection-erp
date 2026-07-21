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
  const { user, profile, tenantId, isMock } = useAuth();

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
    action: "create" | "update" | "delete" | "soft_delete" | "restore",
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
      
      await logAudit("create", collectionName, newDoc.id, null, finalData);
      return newDoc;
    }

    const colRef = collection(db, collectionName);
    const docRef = await withTimeout(
      addDoc(colRef, finalData),
      5000,
      `Erro ao criar registro em ${collectionName} (Sem resposta do servidor)`
    );
    
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

      await logAudit("update", collectionName, docId, previousData, finalData);
      return list[idx];
    }

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

    await logAudit("update", collectionName, docId, previousData, finalData);
    return { id: docId, ...finalData };
  }, [user, tenantId, isMock, invalidateCache]);

  // 3. Exclusão Lógica (Mover para a Lixeira Inteligente)
  const softDeleteDoc = useCallback(async (
    collectionName: string, 
    docId: string, 
    moduleLabel?: string, 
    itemName?: string, 
    itemDetails?: string
  ) => {
    let previousData: any = null;
    invalidateCache(collectionName);
    invalidateCache("recycle_bin");

    const userName = profile?.displayName || user?.email || "Usuário";
    const nowIso = new Date().toISOString();

    if (isMock) {
      const storageKey = `mock_db_${collectionName}`;
      const existing = localStorage.getItem(storageKey);
      if (!existing) throw new Error("Documento não encontrado.");
      
      const list = JSON.parse(existing);
      const idx = list.findIndex((item: any) => item.id === docId);
      if (idx === -1) throw new Error("Documento não encontrado.");

      previousData = list[idx];
      const updatedData = {
        ...previousData,
        deleted: true,
        deletedAt: nowIso,
        deletedBy: userName,
        deletedFrom: collectionName,
      };

      list[idx] = updatedData;
      localStorage.setItem(storageKey, JSON.stringify(list));

      // Gravar na coleção recycle_bin
      const rbStorageKey = `mock_db_recycle_bin`;
      const rbExisting = localStorage.getItem(rbStorageKey);
      const rbList = rbExisting ? JSON.parse(rbExisting) : [];
      
      const displayName = itemName || previousData.name || previousData.title || previousData.sku || previousData.description || `Item #${docId.slice(-4)}`;
      const details = itemDetails || (previousData.sku ? `SKU: ${previousData.sku}` : previousData.total ? `R$ ${previousData.total}` : previousData.email ? previousData.email : "");

      const rbItem = {
        id: `rb-${Math.random().toString(36).substr(2, 9)}`,
        tenantId: tenantId || "shared",
        originalCollection: collectionName,
        originalId: docId,
        moduleName: collectionName,
        moduleLabel: moduleLabel || collectionName,
        itemName: displayName,
        itemDetails: details,
        deletedBy: userName,
        deletedAt: nowIso,
        originalData: previousData,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      rbList.push(rbItem);
      localStorage.setItem(rbStorageKey, JSON.stringify(rbList));

      await logAudit("soft_delete", collectionName, docId, previousData, updatedData);
      return true;
    }

    // Firestore real
    const docRef = doc(db, collectionName, docId);
    const snap = await withTimeout(firestoreGetDoc(docRef), 4000, "Erro ao buscar documento para lixeira");
    if (!snap.exists()) throw new Error("Documento não encontrado.");

    previousData = snap.data();
    const updatedData = {
      ...previousData,
      deleted: true,
      deletedAt: nowIso,
      deletedBy: userName,
      deletedFrom: collectionName,
    };

    await withTimeout(firestoreUpdateDoc(docRef, updatedData), 5000, "Erro ao mover para a lixeira");

    // Adicionar documento na coleção recycle_bin
    const rbColRef = collection(db, "recycle_bin");
    const displayName = itemName || previousData.name || previousData.title || previousData.sku || previousData.description || `Item #${docId.slice(-4)}`;
    const details = itemDetails || (previousData.sku ? `SKU: ${previousData.sku}` : previousData.total ? `R$ ${previousData.total}` : previousData.email ? previousData.email : "");

    await withTimeout(addDoc(rbColRef, {
      tenantId: tenantId || "shared",
      originalCollection: collectionName,
      originalId: docId,
      moduleName: collectionName,
      moduleLabel: moduleLabel || collectionName,
      itemName: displayName,
      itemDetails: details,
      deletedBy: userName,
      deletedAt: nowIso,
      originalData: previousData,
      createdAt: nowIso,
      updatedAt: nowIso,
    }), 5000, "Erro ao salvar na lixeira");

    await logAudit("soft_delete", collectionName, docId, previousData, updatedData);
    return true;
  }, [user, profile, tenantId, isMock, invalidateCache]);

  // 4. Restaurar Documento da Lixeira
  const restoreDoc = useCallback(async (recycleBinId: string, originalCollection: string, originalId: string) => {
    invalidateCache(originalCollection);
    invalidateCache("recycle_bin");

    if (isMock) {
      // 1. Remover flag deleted do documento original
      const storageKey = `mock_db_${originalCollection}`;
      const existing = localStorage.getItem(storageKey);
      if (existing) {
        const list = JSON.parse(existing);
        const idx = list.findIndex((item: any) => item.id === originalId);
        if (idx !== -1) {
          delete list[idx].deleted;
          delete list[idx].deletedAt;
          delete list[idx].deletedBy;
          delete list[idx].deletedFrom;
          localStorage.setItem(storageKey, JSON.stringify(list));
        }
      }

      // 2. Remover da lixeira
      const rbStorageKey = `mock_db_recycle_bin`;
      const rbExisting = localStorage.getItem(rbStorageKey);
      if (rbExisting) {
        const rbList = JSON.parse(rbExisting);
        const newRbList = rbList.filter((item: any) => item.id !== recycleBinId && item.originalId !== originalId);
        localStorage.setItem(rbStorageKey, JSON.stringify(newRbList));
      }

      await logAudit("restore", originalCollection, originalId, null, { restored: true });
      return true;
    }

    // Firestore real
    const originalRef = doc(db, originalCollection, originalId);
    await withTimeout(firestoreUpdateDoc(originalRef, {
      deleted: false,
      deletedAt: null,
      deletedBy: null,
      deletedFrom: null,
    }), 5000, "Erro ao restaurar documento");

    const rbRef = doc(db, "recycle_bin", recycleBinId);
    await withTimeout(firestoreDeleteDoc(rbRef), 5000, "Erro ao remover item da lixeira");

    await logAudit("restore", originalCollection, originalId, null, { restored: true });
    return true;
  }, [tenantId, isMock, invalidateCache]);

  // 5. Exclusão Permanente (Hard Delete)
  const permanentlyDeleteDoc = useCallback(async (recycleBinId: string, originalCollection: string, originalId: string) => {
    invalidateCache(originalCollection);
    invalidateCache("recycle_bin");

    if (isMock) {
      // 1. Remover do banco original
      const storageKey = `mock_db_${originalCollection}`;
      const existing = localStorage.getItem(storageKey);
      if (existing) {
        const list = JSON.parse(existing);
        const newList = list.filter((item: any) => item.id !== originalId);
        localStorage.setItem(storageKey, JSON.stringify(newList));
      }

      // 2. Remover da lixeira
      const rbStorageKey = `mock_db_recycle_bin`;
      const rbExisting = localStorage.getItem(rbStorageKey);
      if (rbExisting) {
        const rbList = JSON.parse(rbExisting);
        const newRbList = rbList.filter((item: any) => item.id !== recycleBinId && item.originalId !== originalId);
        localStorage.setItem(rbStorageKey, JSON.stringify(newRbList));
      }

      await logAudit("delete", originalCollection, originalId, null, null);
      return true;
    }

    // Firestore real
    try {
      const originalRef = doc(db, originalCollection, originalId);
      await firestoreDeleteDoc(originalRef);
    } catch (e) {
      console.warn("Documento original já não existia:", e);
    }

    const rbRef = doc(db, "recycle_bin", recycleBinId);
    await withTimeout(firestoreDeleteDoc(rbRef), 5000, "Erro ao excluir permanentemente da lixeira");

    await logAudit("delete", originalCollection, originalId, null, null);
    return true;
  }, [tenantId, isMock, invalidateCache]);

  // 6. Legado deleteDoc (Mapped to softDeleteDoc by default for maximum safety)
  const deleteDocWrapper = useCallback(async (collectionName: string, docId: string, moduleLabel?: string) => {
    return softDeleteDoc(collectionName, docId, moduleLabel);
  }, [softDeleteDoc]);

  // 7. Obter Todos os Documentos do Tenant (Filtra automaticamente excluídos se includeDeleted = false)
  const getDocs = useCallback(async (collectionName: string, includeDeleted: boolean = false) => {
    const targetTenant = tenantId || "shared";
    const cacheKey = `${collectionName}_${targetTenant}_${includeDeleted ? "all" : "active"}`;

    if (dataCache[cacheKey] && (Date.now() - dataCache[cacheKey].timestamp < CACHE_TTL)) {
      return dataCache[cacheKey].data || [];
    }

    if (activeQueries[cacheKey]) {
      try {
        const cachedRes = await activeQueries[cacheKey];
        return Array.isArray(cachedRes) ? cachedRes : [];
      } catch (err) {
        delete activeQueries[cacheKey];
      }
    }

    const fetchPromise = (async () => {
      try {
        if (isMock) {
          const storageKey = `mock_db_${collectionName}`;
          const existing = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
          const list = existing ? JSON.parse(existing) : [];
          if (!Array.isArray(list)) return [];
          
          return list.filter((item: any) => {
            if (!item || item.tenantId !== targetTenant) return false;
            if (!includeDeleted && item.deleted === true) return false;
            return true;
          });
        }

        const colRef = collection(db, collectionName);
        const q = query(
          colRef, 
          where("tenantId", "==", targetTenant)
        );
        const snap = await withTimeout(
          firestoreGetDocs(q),
          5500,
          `Erro ao buscar lista de ${collectionName}`
        );
        
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!includeDeleted) {
          return docs.filter((item: any) => item.deleted !== true);
        }
        return docs;
      } catch (err) {
        console.warn(`[useDb] Falha ao carregar ${collectionName}:`, err);
        return [];
      }
    })();

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

  // 8. Obter Documento por ID
  const getDocById = useCallback(async (collectionName: string, docId: string) => {
    try {
      if (isMock) {
        const storageKey = `mock_db_${collectionName}`;
        const existing = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
        if (!existing) return null;
        const list = JSON.parse(existing);
        return list.find((item: any) => item && item.id === docId) || null;
      }

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
    deleteDoc: deleteDocWrapper,
    softDeleteDoc,
    restoreDoc,
    permanentlyDeleteDoc,
    getDocs,
    getDocById,
    invalidateCache
  };
}
