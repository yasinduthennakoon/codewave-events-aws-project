// ============================================================================
// auth/AuthContext.jsx
// ----------------------------------------------------------------------------
// Shares the current user's JWT across the whole app via React context.
// JWT is persisted in localStorage so a refresh doesn't kick the user out.
// (Acceptable for a demo; in production prefer httpOnly cookies.)
// ============================================================================

import { createContext, useContext, useEffect, useState } from 'react';
import * as cognito from './cognito.js';

const AuthContext = createContext(null);

const STORAGE_KEY = 'cloudwave_auth';

export function AuthProvider({ children }) {
  // { idToken, email } | null
  const [auth, setAuth] = useState(null);

  // Restore from localStorage on first render.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setAuth(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const login = async (email, password) => {
    const tokens = await cognito.signIn(email, password);
    const session = { idToken: tokens.idToken, email: tokens.email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setAuth(session);
  };

  const logout = () => {
    cognito.signOut();
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
