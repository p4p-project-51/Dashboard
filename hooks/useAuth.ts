"use client";

import { useState, useEffect } from "react";

const AUTH_KEY_STORAGE_KEY = "upload-auth-key";

export function useAuth() {
  const [authKey, setAuthKey] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Load auth key from localStorage
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem(AUTH_KEY_STORAGE_KEY);
      if (storedKey) {
        setAuthKey(storedKey);
        setIsAuthenticated(true);
      }
    }
  }, []);

  const authenticate = (key: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_KEY_STORAGE_KEY, key);
      // Reload the page to reinitialize WebSocket with new auth
      window.location.reload();
    }
    setAuthKey(key);
    setIsAuthenticated(true);
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_KEY_STORAGE_KEY);
      window.location.reload();
    }
    setAuthKey(null);
    setIsAuthenticated(false);
  };

  return {
    authKey,
    isAuthenticated,
    authenticate,
    logout,
  };
}