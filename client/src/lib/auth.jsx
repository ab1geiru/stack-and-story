import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((data) => active && setUser(data.user))
      .catch(() => active && setUser(null))
      .finally(() => active && setStatus('ready'));
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (username, password) => {
    const data = await api.signIn(username, password);
    setUser(data.user);
    return data.user;
  }, []);

  const signOut = useCallback(async () => {
    await api.signOut();
    setUser(null);
  }, []);

  const signUp = useCallback(async (details) => {
    const data = await api.signUp(details);
    setUser(data.user);
    return data.user;
  }, []);

  const saveProfilePicture = useCallback(async (picture) => {
    const data = await api.saveProfilePicture(picture);
    setUser(data.user);
    return data.user;
  }, []);

  // Called when the server reports the session has ended (for example after a reset).
  const clearUser = useCallback(() => setUser(null), []);

  const value = useMemo(
    () => ({ user, status, signIn, signUp, signOut, saveProfilePicture, clearUser }),
    [user, status, signIn, signUp, signOut, saveProfilePicture, clearUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
