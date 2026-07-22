"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { 
  User as FirebaseUser, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, onSnapshot, updateDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { safeLocalStorageSetItem } from "@/lib/imageUpload";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  activeTenantId: string;
  tenants: {
    [tenantId: string]: {
      role: 'owner' | 'admin' | 'operator' | 'viewer';
      joinedAt: any;
    }
  };
  phone?: string;
  photo?: string;
  preferences?: {
    language: string;
    notifications: boolean;
  };
  createdAt?: string;
}

interface AuthContextType {
  user: FirebaseUser | { uid: string; email: string; displayName: string } | null;
  profile: UserProfile | null;
  tenantId: string | null;
  role: 'owner' | 'admin' | 'operator' | 'viewer' | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  isMock: boolean;
  activeCompany: any | null;
  createCompany: (name: string, cnpj: string) => Promise<string>;
  updateProfileMock: (newProfile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isFirebasePlaceholder = 
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("your-api-key") ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "your-project-id";

const MOCK_PROFILE: UserProfile = {
  uid: "mock-uid-carol-ramos",
  email: "admin@carolramos.com.br",
  displayName: "Carol Ramos",
  activeTenantId: "carol-ramos-collection",
  tenants: {
    "carol-ramos-collection": { role: "owner", joinedAt: new Date().toISOString() },
    "beleza-saas-demo": { role: "admin", joinedAt: new Date().toISOString() }
  }
};

const PERSISTED_USER_PROFILE_KEY = "mock_user_profile_persistent";

const getPersistedUserProfile = (): UserProfile => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(PERSISTED_USER_PROFILE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Erro ao carregar perfil mock persistido:", e);
    }
  }
  return MOCK_PROFILE;
};

const savePersistedUserProfile = (newProfile: UserProfile) => {
  if (typeof window !== "undefined") {
    try {
      safeLocalStorageSetItem(PERSISTED_USER_PROFILE_KEY, JSON.stringify(newProfile));
    } catch (e) {
      console.error("Erro ao salvar perfil mock persistido:", e);
    }
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [activeCompany, setActiveCompany] = useState<any | null>(null);

  const tenantId = profile?.activeTenantId || null;
  const role = tenantId && profile?.tenants?.[tenantId]
    ? profile.tenants[tenantId].role
    : null;

  useEffect(() => {
    if (isFirebasePlaceholder) {
      setUser(null);
      setProfile(null);
      setIsMock(true);
      setLoading(false);
      return;
    }

    // Fluxo Real do Firebase Auth
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Escuta em tempo real do Firestore (apenas se não for mock)
  useEffect(() => {
    if (!user || isMock) return;

    const isDev = process.env.NODE_ENV === "development";
    if (isDev) console.log("[Auth Step 5] Sincronizando perfil do usuário no Firestore (uid:", user.uid, ")...");

    // Timeout de segurança determinístico para garantir encerramento do loading
    const safetyTimeout = setTimeout(() => {
      if (isDev) console.warn("[Auth Step 6] Timeout do Firestore atingido. Finalizando carregamento com dados da conta...");
      const defaultTenantId = `tenant-${user.uid.substring(0, 8)}`;
      const userProfileObj: UserProfile = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Usuário Google",
        activeTenantId: defaultTenantId,
        tenants: {
          [defaultTenantId]: {
            role: "owner" as const,
            joinedAt: new Date().toISOString()
          }
        },
        createdAt: new Date().toISOString()
      };
      setProfile((prev) => prev || userProfileObj);
      setLoading(false);
    }, 4000);

    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeProfile = onSnapshot(
      userDocRef,
      async (docSnap) => {
        clearTimeout(safetyTimeout);

        // PASSO 1: Procurar users/{UID}. Se existir, utilizar esse perfil e garantir vínculo com a empresa principal.
        if (docSnap.exists()) {
          let data = docSnap.data() as UserProfile;
          if (!data.activeTenantId || data.activeTenantId !== "carol-ramos-collection") {
            data = {
              ...data,
              activeTenantId: "carol-ramos-collection",
              tenants: {
                ...(data.tenants || {}),
                "carol-ramos-collection": {
                  role: "owner" as const,
                  joinedAt: new Date().toISOString()
                }
              }
            };
            try {
              await setDoc(userDocRef, data, { merge: true });
            } catch (e) {
              console.error("[Auth] Erro ao atualizar vínculo da empresa no perfil:", e);
            }
          }
          if (isDev) console.log("[Auth PASSO 1] Perfil retornado por UID para:", data.email, "Tenant:", data.activeTenantId);
          setProfile(data);
          setLoading(false);
          return;
        }

        // PASSO 2: Se não existir users/{UID}, pesquisar no Firestore por e-mail.
        try {
          if (user.email) {
            const usersQuery = query(collection(db, "users"), where("email", "==", user.email));
            const querySnap = await getDocs(usersQuery);

            if (querySnap.size === 1) {
              // PASSO 2: Encontrado exatamente UM perfil.
              const existingData = querySnap.docs[0].data() as UserProfile;
              const reusedTenantId = existingData.activeTenantId || Object.keys(existingData.tenants || {})[0] || "carol-ramos-collection";

              const linkedProfileObj: UserProfile = {
                ...existingData,
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || existingData.displayName || "Usuário",
                activeTenantId: reusedTenantId,
                tenants: existingData.tenants || {
                  [reusedTenantId]: {
                    role: "owner" as const,
                    joinedAt: new Date().toISOString()
                  }
                }
              };

              // Reutiliza activeTenantId e salva apenas o vinculo no documento users/{user.uid}
              // NÃO cria nova empresa. NÃO cria novo tenant.
              setProfile(linkedProfileObj);
              setLoading(false);
              await setDoc(userDocRef, linkedProfileObj);
              if (isDev) console.log("[Auth PASSO 2] Vínculo reutilizado com sucesso para o tenant:", reusedTenantId);
              return;
            } else if (querySnap.size > 1) {
              // PASSO 3: Encontrado MAIS DE UM perfil com o mesmo e-mail.
              console.error(`[Auth PASSO 3] ERRO CRÍTICO: Encontrados ${querySnap.size} perfis para o mesmo e-mail (${user.email}). Interrompendo vínculo automático.`);
              const firstProfile = querySnap.docs[0].data() as UserProfile;
              setProfile(firstProfile);
              setLoading(false);
              return;
            }
          }

          // PASSO 4: Somente se não existir nenhum perfil por UID e nenhum por e-mail.
          const defaultTenantId = `tenant-${user.uid.substring(0, 8)}`;
          const defaultProfileObj: UserProfile = {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "Usuário",
            activeTenantId: defaultTenantId,
            tenants: {
              [defaultTenantId]: {
                role: "owner" as const,
                joinedAt: new Date().toISOString()
              }
            },
            createdAt: new Date().toISOString()
          };

          setProfile(defaultProfileObj);
          setLoading(false);

          if (isDev) console.log("[Auth PASSO 4] Conta inédita. Criando novo tenant e empresa no Firestore...");
          const compDocRef = doc(db, "companies", defaultTenantId);
          await setDoc(compDocRef, {
            id: defaultTenantId,
            name: `${user.displayName || "Minha"} Empresa`,
            tradeName: `${user.displayName || "Minha"} Empresa`,
            cnpj: "00.000.000/0000-00",
            status: "active",
            createdAt: new Date().toISOString()
          });

          await setDoc(userDocRef, defaultProfileObj);
        } catch (err) {
          console.error("[Auth] Erro na resolução de perfil/tenant:", err);
          setLoading(false);
        }
      },
      (error) => {
        clearTimeout(safetyTimeout);
        console.error("[Auth] Erro no listener do Firestore:", error);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribeProfile();
    };
  }, [user, isMock]);

  // Sincroniza dados da Empresa Ativa (Req 2 & 3)
  useEffect(() => {
    if (!tenantId) {
      setActiveCompany(null);
      return;
    }

    if (isMock) {
      try {
        const saved = localStorage.getItem(`company_profile_${tenantId}`);
        if (saved) {
          setActiveCompany(JSON.parse(saved));
        } else {
          const defaultCompany = {
            id: tenantId,
            name: tenantId === "carol-ramos-collection" ? "Carol Ramos Collection" : "Beleza SaaS Demo",
            tradeName: tenantId === "carol-ramos-collection" ? "Carol Ramos Collection" : "Beleza SaaS Demo",
            logo: "/logo.png",
            cnpj: "12.345.678/0001-99",
            email: "contato@carolramos.com.br",
            phone: "(11) 99999-9999",
            createdAt: new Date().toISOString()
          };
          safeLocalStorageSetItem(`company_profile_${tenantId}`, JSON.stringify(defaultCompany));
          setActiveCompany(defaultCompany);
        }
      } catch (e) {
        console.error("Erro ao carregar empresa mock:", e);
      }
      return;
    }

    const docRef = doc(db, "companies", tenantId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setActiveCompany(snap.data());
      } else {
        const defaultCompany = {
          id: tenantId,
          name: tenantId === "carol-ramos-collection" ? "Carol Ramos Collection" : "Beleza SaaS Demo",
          tradeName: tenantId === "carol-ramos-collection" ? "Carol Ramos Collection" : "Beleza SaaS Demo",
          cnpj: "12.345.678/0001-99",
          email: "contato@carolramos.com.br",
          phone: "(11) 99999-9999",
          createdAt: new Date().toISOString()
        };
        setActiveCompany(defaultCompany);
      }
    });

    return () => unsubscribe();
  }, [tenantId, isMock]);

  const registerWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    if (isFirebasePlaceholder) {
      throw new Error("Configuração do Firebase pendente. Adicione as chaves de API para cadastrar contas.");
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
  }, [isFirebasePlaceholder]);

  const resetPassword = useCallback(async (email: string) => {
    if (isFirebasePlaceholder) {
      throw new Error("Configuração do Firebase pendente. Adicione as chaves de API para envio de e-mail de recuperação.");
    }
    await sendPasswordResetEmail(auth, email);
  }, [isFirebasePlaceholder]);

  const login = useCallback(async (email: string, password: string) => {
    if (isMock || isFirebasePlaceholder || email === "admin@carolramos.com.br") {
      // Simulação de login
      if (email === "admin@carolramos.com.br" && password === "123456") {
        const currentProfile = getPersistedUserProfile();
        const mockUser = {
          uid: currentProfile.uid,
          email: currentProfile.email,
          displayName: currentProfile.displayName,
        };
        const session = {
          ...mockUser,
          profile: currentProfile
        };
        safeLocalStorageSetItem("mock_auth_session", JSON.stringify(session));
        setUser(mockUser);
        setProfile(currentProfile);
        setIsMock(true);
        setLoading(false);
        return;
      } else {
        throw new Error("Credenciais inválidas. Para simulação use: admin@carolramos.com.br / 123456");
      }
    }

    // Login real
    await signInWithEmailAndPassword(auth, email, password);
  }, [isMock, isFirebasePlaceholder]);

  const loginWithGoogle = useCallback(async () => {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) console.log("[Auth Step 1] Iniciando loginWithGoogle...");

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });

    try {
      if (isDev) console.log("[Auth Step 2] Disparando signInWithPopup...");
      const credential = await signInWithPopup(auth, provider);
      if (isDev) console.log("[Auth Step 3] Popup Google concluído! Usuário:", credential.user?.email);
    } catch (err: any) {
      console.error("[Auth ERROR] Erro no signInWithPopup do Google:", err);
      if (isFirebasePlaceholder) {
        if (isDev) console.warn("[Auth Fallback] Modo de desenvolvimento sem chaves de API. Carregando perfil mock...");
        const currentProfile = getPersistedUserProfile();
        const mockUser = {
          uid: currentProfile.uid,
          email: currentProfile.email,
          displayName: currentProfile.displayName,
        };

        const session = {
          ...mockUser,
          profile: currentProfile
        };

        safeLocalStorageSetItem("mock_auth_session", JSON.stringify(session));
        setUser(mockUser);
        setProfile(currentProfile);
        setIsMock(true);
        setLoading(false);
        return;
      }
      setLoading(false);
      throw err;
    }
  }, [isFirebasePlaceholder]);

  const logout = useCallback(async () => {
    if (isMock) {
      localStorage.removeItem("mock_auth_session");
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    await signOut(auth);
  }, [isMock]);

  const switchTenant = useCallback(async (newTenantId: string) => {
    if (!profile) return;
    
    if (!profile.tenants[newTenantId]) {
      throw new Error("Usuário não tem permissão para este Tenant.");
    }

    const updatedProfile = {
      ...profile,
      activeTenantId: newTenantId
    };

    if (isMock) {
      setProfile(updatedProfile);
      savePersistedUserProfile(updatedProfile);
      const savedMockSession = localStorage.getItem("mock_auth_session");
      if (savedMockSession) {
        const parsed = JSON.parse(savedMockSession);
        parsed.profile = updatedProfile;
        safeLocalStorageSetItem("mock_auth_session", JSON.stringify(parsed));
      }
      return;
    }

    // Firestore update
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        activeTenantId: newTenantId
      });
    }
  }, [profile, isMock, user]);

  const createCompany = useCallback(async (name: string, cnpj: string) => {
    if (!profile) throw new Error("Usuário não autenticado.");

    // Gerar slug simples para ID do tenant
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const uniqueTenantId = `${slug}-${Date.now().toString(36)}`;

    const newCompanyObj = {
      id: uniqueTenantId,
      name,
      tradeName: name,
      cnpj,
      status: "active",
      createdAt: new Date().toISOString()
    };

    const updatedTenants = {
      ...profile.tenants,
      [uniqueTenantId]: {
        role: "owner" as const,
        joinedAt: new Date().toISOString()
      }
    };

    const updatedProfile = {
      ...profile,
      tenants: updatedTenants,
      activeTenantId: uniqueTenantId
    };

    if (isMock) {
      safeLocalStorageSetItem(`company_profile_${uniqueTenantId}`, JSON.stringify(newCompanyObj));
      setProfile(updatedProfile);
      savePersistedUserProfile(updatedProfile);
      const savedMockSession = localStorage.getItem("mock_auth_session");
      if (savedMockSession) {
        const parsed = JSON.parse(savedMockSession);
        parsed.profile = updatedProfile;
        safeLocalStorageSetItem("mock_auth_session", JSON.stringify(parsed));
      }
      return uniqueTenantId;
    }

    // Firestore real company profile write
    const compDocRef = doc(db, "companies", uniqueTenantId);
    await setDoc(compDocRef, newCompanyObj);

    // Update user profile tenants
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        tenants: updatedTenants,
        activeTenantId: uniqueTenantId
      });
    }

    return uniqueTenantId;
  }, [profile, isMock, user]);

  const updateProfileMock = useCallback((newProfile: UserProfile) => {
    setProfile(newProfile);
    savePersistedUserProfile(newProfile);
    const savedMockSession = localStorage.getItem("mock_auth_session");
    if (savedMockSession) {
      const parsed = JSON.parse(savedMockSession);
      parsed.profile = newProfile;
      safeLocalStorageSetItem("mock_auth_session", JSON.stringify(parsed));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, tenantId, role, loading, login, registerWithEmail, resetPassword, loginWithGoogle, logout, switchTenant, isMock, activeCompany, createCompany, updateProfileMock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
