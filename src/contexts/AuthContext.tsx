import React, { createContext, useContext, useState, useEffect } from 'react';
import { MemberAccount, Contact } from '../types';

interface AuthContextType {
  user: MemberAccount | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  login: (usernameOrPhone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, phone: string, area: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updatePrivacy: (settings: Partial<MemberAccount>) => Promise<boolean>;
  updateProfile: (data: Partial<Contact>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MemberAccount | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kotbari_auth_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('kotbari_auth_token');
    if (!savedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(savedToken);
        document.cookie = `kotbari_token=${savedToken}; path=/; SameSite=Lax; max-age=2592000`;
      } else {
        localStorage.removeItem('kotbari_auth_token');
        document.cookie = 'kotbari_token=; path=/; max-age=0';
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.error('Failed to fetch current user', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (usernameOrPhone: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrPhone, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'লগইন ব্যর্থ হয়েছে।' };
      }

      localStorage.setItem('kotbari_auth_token', data.token);
      document.cookie = `kotbari_token=${data.token}; path=/; SameSite=Lax; max-age=2592000`;
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'সার্ভারে সংযোগ করা সম্ভব হয়নি।' };
    }
  };

  const register = async (name: string, phone: string, area: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, area, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।' };
      }

      localStorage.setItem('kotbari_auth_token', data.token);
      document.cookie = `kotbari_token=${data.token}; path=/; SameSite=Lax; max-age=2592000`;
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'সার্ভারে সংযোগ করা সম্ভব হয়নি।' };
    }
  };

  const logout = () => {
    localStorage.removeItem('kotbari_auth_token');
    document.cookie = 'kotbari_token=; path=/; max-age=0';
    setToken(null);
    setUser(null);
  };

  const updatePrivacy = async (settings: Partial<MemberAccount>) => {
    if (!token) return false;
    try {
      const res = await fetch('/api/auth/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(prev => prev ? { ...prev, ...updated } : null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update privacy settings', err);
      return false;
    }
  };

  const updateProfile = async (contactData: Partial<Contact>) => {
    if (!token || !user?.contactId) return false;
    try {
      const res = await fetch(`/api/contacts/${user.contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(contactData)
      });

      if (res.ok) {
        const updatedContact = await res.json();
        setUser(prev => prev ? { ...prev, contact: updatedContact } : null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update profile', err);
      return false;
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAdmin,
      login,
      register,
      logout,
      refreshUser,
      updatePrivacy,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
