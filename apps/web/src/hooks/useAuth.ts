import { useState, useEffect } from 'react';
import { apiClient } from '@folio/api-client';

interface User {
  id: string;
  email: string;
  name: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const res = await apiClient.get<{ user: User | null }>('/auth/session');
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signin = async (email: string, password: string) => {
    const res = await apiClient.post<{ user: User }>('/auth/signin', { email, password });
    setUser(res.user);
    return res.user;
  };

  const signout = async () => {
    await apiClient.post('/auth/signout', {});
    setUser(null);
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await apiClient.post<{ user: User }>('/auth/signup', { name, email, password });
    setUser(res.user);
    return res.user;
  };

  useEffect(() => {
    checkSession();
  }, []);

  return { user, loading, signin, signout, signup };
}
