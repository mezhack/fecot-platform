"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, type Athlete, tokenStorage, userStorage } from "@/lib/api";

/**
 * Hook simples de autenticação. Lê user/token do localStorage,
 * oferece login/logout, revalida no backend com /api/me.
 *
 * Em apps maiores, vale substituir por Context/Zustand.
 */
export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);

  // Revalida /api/me ao montar — se o token for inválido, limpa storage
  useEffect(() => {
    const token = tokenStorage.get();
    const cached = userStorage.get();

    if (!token) {
      setLoading(false);
      return;
    }

    // Otimista: mostra o user em cache enquanto revalida
    if (cached) setUser(cached);

    api
      .me()
      .then((u) => {
        setUser(u);
        userStorage.set(u);
      })
      .catch(() => {
        tokenStorage.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await api.login(identifier, password);
      tokenStorage.set(res.access_token);
      userStorage.set(res.athlete);
      setUser(res.athlete);
      return res.athlete;
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    router.push("/login");
  }, [router]);

  // Helpers semânticos de role
  const isAthleteOnly = user?.role === "athlete";
  const canAccessDashboard = user && user.role !== "athlete";
  const isAdmin = user?.role === "admin";

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAthleteOnly,
    canAccessDashboard,
    isAdmin,
  };
}
