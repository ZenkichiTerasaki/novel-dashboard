"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, logoutUser, parseJwtPayload, loginUser as apiLoginUser, registerUser as apiRegisterUser } from "@/lib/api";

interface AuthUser {
  userId: number;
  email?: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: typeof apiLoginUser;
  register: typeof apiRegisterUser;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ access_token: "" }),
  register: async () => ({ id: 0, name: "", email: "" }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = getToken();
    if (savedToken) {
      const payload = parseJwtPayload(savedToken);
      if (payload && payload.userId) {
        // トークン期限切れの確認
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          logoutUser();
          setTokenState(null);
          setUser(null);
        } else {
          setTokenState(savedToken);
          setUser({ userId: payload.userId, email: payload.email });
        }
      } else {
        removeTokenFromState();
      }
    }
    setIsLoading(false);
  }, []);

  const removeTokenFromState = () => {
    setTokenState(null);
    setUser(null);
  };

  const login: typeof apiLoginUser = async (data) => {
    const res = await apiLoginUser(data);
    if (res.access_token) {
      setTokenState(res.access_token);
      const payload = parseJwtPayload(res.access_token);
      if (payload && payload.userId) {
        setUser({ userId: payload.userId, email: payload.email });
      }
    }
    return res;
  };

  const register: typeof apiRegisterUser = async (data) => {
    return apiRegisterUser(data);
  };

  const logout = () => {
    removeTokenFromState();
    logoutUser();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
