import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext({
  role: null,
  setRole: () => {},
  resetRole: () => {},
});

export const AuthProvider = ({ children }) => {
  const [role, setRole] = useState(null);

  useEffect(() => {
    console.log('[Auth] role state changed →', role);
  }, [role]);

  const wrappedSetRole = useCallback((value) => {
    console.log('[Auth] setRole called with', value);
    setRole(value);
  }, []);

  const resetRole = () => setRole(null);

  const value = useMemo(
    () => ({
      role,
      setRole: wrappedSetRole,
      resetRole,
    }),
    [role, wrappedSetRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

