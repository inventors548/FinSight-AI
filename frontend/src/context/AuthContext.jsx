"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from "react";

import API from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load saved user information on mount (client-side)
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("finsight_user");
      const token = localStorage.getItem("finsight_token");

      if (savedUser && token) {
        setUser(JSON.parse(savedUser));
      } else {
        setUser(null);
      }
    } catch {
      localStorage.removeItem("finsight_user");
      localStorage.removeItem("finsight_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save authentication data
  const saveAuthentication = (data) => {
    localStorage.setItem(
      "finsight_token",
      data.token
    );

    localStorage.setItem(
      "finsight_user",
      JSON.stringify(data.user)
    );

    setUser(data.user);
  };

  // Register
  const register = async (userData) => {
    const response = await API.post(
      "/auth/register",
      userData
    );

    saveAuthentication(response.data);

    return response.data;
  };

  // Login
  const login = async (credentials) => {
    const response = await API.post(
      "/auth/login",
      credentials
    );

    saveAuthentication(response.data);

    return response.data;
  };

  // Update user information
  const updateUser = useCallback((updatedUser) => {
    localStorage.setItem(
      "finsight_user",
      JSON.stringify(updatedUser)
    );

    setUser(updatedUser);
  }, []);

  // Logout
  const logout = () => {
    localStorage.removeItem("finsight_token");
    localStorage.removeItem("finsight_user");

    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom authentication hook
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
