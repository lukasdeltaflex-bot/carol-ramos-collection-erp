"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  User as FirebaseUser, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

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
}

interface AuthContextType {
  user: FirebaseUser | { uid: string; email: string; displayName: string } | null;
  profile: UserProfile | null;
  tenantId: string | null;
  role: 'owner' | 'admin' | 'operator' | 'viewer' | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  isMock: boolean;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    // 1. Verificar se há sessão mock salva no localStorage
    const savedMockSession = localStorage.getItem("mock_auth_session");
    if (savedMockSession && isFirebasePlaceholder) {
      try {
        const parsed = JSON.parse(savedMockSession);
        setUser({ uid: parsed.uid, email: parsed.email, displayName: parsed.displayName });
        setProfile(parsed.profile);
        setIsMock(true);
        setLoading(false);
        return;
      } catch (e) {
        console.error("Erro ao carregar sessão mock:", e);
      }
    }

    if (isFirebasePlaceholder) {
      setUser(null);
      setProfile(null);
      setIsMock(true);
      setLoading(false);
      return;
    }

    // 2. Fluxo Real do Firebase Auth
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

    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeProfile = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao sincronizar dados do usuário no Firestore:", error);
        setLoading(false);
      }
    );

    return () => unsubscribeProfile();
  }, [user, isMock]);

  const login = async (email: string, password: string) => {
    if (isMock || isFirebasePlaceholder || email === "admin@carolramos.com.br") {
      // Simulação de login
      if (email === "admin@carolramos.com.br" && password === "123456") {
        const mockUser = {
          uid: MOCK_PROFILE.uid,
          email: MOCK_PROFILE.email,
          displayName: MOCK_PROFILE.displayName,
        };
        const session = {
          ...mockUser,
          profile: MOCK_PROFILE
        };
        localStorage.setItem("mock_auth_session", JSON.stringify(session));
        setUser(mockUser);
        setProfile(MOCK_PROFILE);
        setIsMock(true);
        setLoading(false);
        return;
      } else {
        throw new Error("Credenciais inválidas. Para simulação use: admin@carolramos.com.br / 123456");
      }
    }

    // Login real
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (isMock) {
      localStorage.removeItem("mock_auth_session");
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    await signOut(auth);
  };

  const switchTenant = async (newTenantId: string) => {
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
      const savedMockSession = localStorage.getItem("mock_auth_session");
      if (savedMockSession) {
        const parsed = JSON.parse(savedMockSession);
        parsed.profile = updatedProfile;
        localStorage.setItem("mock_auth_session", JSON.stringify(parsed));
      }
      return;
    }

    // Firestore update
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, {
      activeTenantId: newTenantId
    });
  };

  const tenantId = profile?.activeTenantId || null;
  const role = tenantId && profile?.tenants?.[tenantId]
    ? profile.tenants[tenantId].role
    : null;

  return (
    <AuthContext.Provider value={{ user, profile, tenantId, role, loading, login, logout, switchTenant, isMock }}>
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
