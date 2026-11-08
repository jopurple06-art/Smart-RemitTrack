import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);
const DEMO_EMAIL = 'demo@smartremittrack.com';
const DEMO_PASSWORD = 'DemoPass123!';

function readStoredUser() {
  try { return JSON.parse(localStorage.getItem('remittrack-user') || 'null'); }
  catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem('remittrack-token')));

  function persist(result) {
    localStorage.setItem('remittrack-token', result.token);
    localStorage.setItem('remittrack-user', JSON.stringify(result.user));
    setUser(result.user);
  }

  async function signIn(email, password) {
    persist(await api('/auth/login', { method: 'POST', body: { email, password } }));
  }

  async function signUp(name, email, password) {
    persist(await api('/auth/register', { method: 'POST', body: { name, email, password } }));
  }

  function signOut() {
    localStorage.removeItem('remittrack-token');
    localStorage.removeItem('remittrack-user');
    setUser(null);
  }

  function updateUser(nextUser) {
    localStorage.setItem('remittrack-user', JSON.stringify(nextUser));
    setUser(nextUser);
  }

  useEffect(() => {
    const token = localStorage.getItem('remittrack-token');
    const previousEmail = readStoredUser()?.email;
    if (!token) {
      setChecking(false);
      return undefined;
    }
    let active = true;
    (async () => {
      try {
        const result = await api('/auth/me');
        if (active) {
          localStorage.setItem('remittrack-user', JSON.stringify(result.user));
          setUser(result.user);
        }
      } catch {
        signOut();
        if (active && previousEmail === DEMO_EMAIL) {
          try { await signIn(DEMO_EMAIL, DEMO_PASSWORD); } catch { /* send the user to login */ }
        }
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('smart-remittrack:session-expired', onExpired);
    return () => window.removeEventListener('smart-remittrack:session-expired', onExpired);
  }, []);

  return <AuthContext.Provider value={{ user, checking, signIn, signUp, signOut, updateUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
