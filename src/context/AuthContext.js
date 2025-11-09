import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { getFirebaseAuth } from "../services/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const AuthContext = createContext({
  user: null,
  role: null,
  setRole: () => {},
  resetRole: () => {},
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    console.log("[Auth] Setting up onAuthStateChanged listener");
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("[Auth] onAuthStateChanged fired", {
        hasUser: !!firebaseUser,
        email: firebaseUser?.email,
      });
      setUser(firebaseUser);
    });
    return () => {
      console.log("[Auth] Cleaning up onAuthStateChanged listener");
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth not initialized");
    
    try {
      // Try to sign in first
      console.log("[Auth] Attempting to sign in:", email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Don't call setUser here - onAuthStateChanged will handle it
      console.log("[Auth] Sign in successful");
      return result.user;
    } catch (error) {
      // If user doesn't exist (auth/user-not-found or auth/invalid-credential), create new account
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/invalid-credential" ||
        error.code === "auth/invalid-email"
      ) {
        console.log("[Auth] User not found, creating new account:", email);
        try {
          const result = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          // Don't call setUser here - onAuthStateChanged will handle it
          console.log("[Auth] New account created successfully");
          return result.user;
        } catch (createError) {
          console.error("[Auth] Failed to create account:", createError);
          throw createError;
        }
      }
      // If it's a wrong password error, throw it
      if (error.code === "auth/wrong-password") {
        console.error("[Auth] Wrong password");
        throw new Error("Incorrect password. Please try again.");
      }
      // For any other error, throw it
      console.error("[Auth] Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  const resetRole = () => setRole(null);

  const value = useMemo(
    () => ({
      user,
      role,
      setRole,
      resetRole,
      login,
      logout,
    }),
    [user, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
