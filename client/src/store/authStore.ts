import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  university: string;
  year?: string;
  role: 'student' | 'landlord';
  budgetMin?: number;
  budgetMax?: number;
  avatar?: string;
  isEduVerified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    name: string;
    university: string;
    year?: string;
    role: 'student' | 'landlord';
    budgetMin?: number;
    budgetMax?: number;
  }) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('dormbid_user') || 'null'),
  token: localStorage.getItem('dormbid_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('dormbid_token', data.token);
      localStorage.setItem('dormbid_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  signup: async (signupData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/signup', signupData);
      localStorage.setItem('dormbid_token', data.token);
      localStorage.setItem('dormbid_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Signup failed');
    }
  },

  logout: () => {
    localStorage.removeItem('dormbid_token');
    localStorage.removeItem('dormbid_user');
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem('dormbid_token');
    if (!token) return;
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('dormbid_user', JSON.stringify(data));
      set({ user: data, token });
    } catch {
      localStorage.removeItem('dormbid_token');
      localStorage.removeItem('dormbid_user');
      set({ user: null, token: null });
    }
  },
}));
