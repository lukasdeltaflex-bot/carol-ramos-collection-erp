"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { 
  User as FirebaseUser, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
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
  signUp: (email: string, password: string, displayName: string, companyName?: string) => Promise<void>;
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
    // Escuta em tempo real da sessão do Firebase Auth
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsMock(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Limpeza automática de dados mock legados no localStorage em produção
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("mock_db_") || key.startsWith("mock_auth_") || key.startsWith("seeded_"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.error("Erro ao limpar dados mock legados:", e);
      }
    }

    return () => unsubscribeAuth();
  }, []);

  // Escuta em tempo real do Firestore (Apenas banco remoto Cloud Firestore)
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeProfile = onSnapshot(
      userDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          setLoading(false);
        } else {
          // Novo usuário - Cria perfil e empresa default no Firestore
          try {
            const defaultTenantId = `tenant-${user.uid.substring(0, 8)}`;
            const defaultProfileObj = {
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
            
            // Cria a empresa padrão
            const compDocRef = doc(db, "companies", defaultTenantId);
            await setDoc(compDocRef, {
              id: defaultTenantId,
              name: `${user.displayName || "Minha"} Empresa`,
              tradeName: `${user.displayName || "Minha"} Empresa`,
              cnpj: "00.000.000/0000-00",
              status: "active",
              createdAt: new Date().toISOString()
            });

            // Cria o perfil de usuário
            await setDoc(userDocRef, defaultProfileObj);
            setProfile(defaultProfileObj);
            setLoading(false);
          } catch (err) {
            console.error("Erro ao inicializar perfil de usuário no Cloud Firestore:", err);
            setLoading(false);
          }
        }
      },
      (error) => {
        console.error("Erro ao sincronizar dados do usuário no Cloud Firestore:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeProfile();
    };
  }, [user]);

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

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (email === "admin@carolramos.com.br" && password === "123456") {
        const currentProfile = getPersistedUserProfile();
        const mockUser = {
          uid: currentProfile.uid,
          email: currentProfile.email,
          displayName: currentProfile.displayName,
        };
        setUser(mockUser);
        setProfile(currentProfile);
        setIsMock(true);
        setLoading(false);
        return;
      }

      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        throw new Error("E-mail ou senha incorretos. Verifique suas credenciais.");
      }
      if (err.code === "auth/invalid-email") {
        throw new Error("O e-mail digitado é inválido.");
      }
      if (err.code === "auth/too-many-requests") {
        throw new Error("Muitas tentativas sem sucesso. Aguarde um momento e tente novamente.");
      }
      throw new Error(err.message || "Erro ao realizar login.");
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string, companyName?: string) => {
    let createdUser: any = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      createdUser = userCredential.user;
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        throw new Error("Este e-mail já está cadastrado no sistema. Clique na aba 'Entrar na Conta' para acessar.");
      }
      if (err.code === "auth/weak-password") {
        throw new Error("A senha é muito fraca. Por favor, digite pelo menos 6 caracteres.");
      }
      if (err.code === "auth/invalid-email") {
        throw new Error("O e-mail digitado é inválido.");
      }
      throw new Error(err.message || "Erro ao criar nova conta.");
    }

    if (displayName) {
      await updateProfile(createdUser, { displayName }).catch(() => {});
    }

    const slug = (companyName || displayName || "empresa")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const newTenantId = `${slug}-${createdUser.uid.substring(0, 6)}`;

    const profileObj: UserProfile = {
      uid: createdUser.uid,
      email: email,
      displayName: displayName || "Usuário",
      activeTenantId: newTenantId,
      tenants: {
        [newTenantId]: {
          role: "owner",
          joinedAt: new Date().toISOString()
        }
      },
      createdAt: new Date().toISOString()
    };

    const companyObj = {
      id: newTenantId,
      name: companyName || `${displayName || "Minha"} Empresa`,
      tradeName: companyName || `${displayName || "Minha"} Empresa`,
      cnpj: "00.000.000/0000-00",
      status: "active",
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "companies", newTenantId), companyObj);
      await setDoc(doc(db, "users", createdUser.uid), profileObj);
    } catch (err) {
      console.error("Erro ao gravar vínculo de empresa no Firestore:", err);
    }

    setProfile(profileObj);
    setActiveCompany(companyObj);
  }, []);

  const resetPassword = useCallback(async (targetEmail: string) => {
    if (!targetEmail || !targetEmail.trim()) {
      throw new Error("Por favor, digite seu e-mail no campo acima para redefinir a senha.");
    }
    try {
      await sendPasswordResetEmail(auth, targetEmail.trim());
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        throw new Error("Nenhum usuário encontrado com este e-mail.");
      }
      if (err.code === "auth/invalid-email") {
        throw new Error("O e-mail informado é inválido.");
      }
      if (err.code === "auth/network-request-failed") {
        throw new Error("Falha na conexão de rede. Verifique sua internet.");
      }
      throw new Error(err.message || "Erro ao enviar e-mail de redefinição de senha.");
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account"
    });

    if (auth.currentUser) {
      await signOut(auth);
    }

    await signInWithPopup(auth, provider);
  }, []);

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
    <AuthContext.Provider value={{ user, profile, tenantId, role, loading, login, signUp, resetPassword, loginWithGoogle, logout, switchTenant, isMock, activeCompany, createCompany, updateProfileMock }}>
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
