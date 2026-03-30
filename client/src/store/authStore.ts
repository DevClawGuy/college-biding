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
  phone?: string;
  isEduVerified: boolean;
  parentEmail?: string | null;
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
  user: JSON.parse(localStorage.getItem('houserush_user') || 'null'),
  token: localStorage.getItem('houserush_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('houserush_token', data.token);
      localStorage.setItem('houserush_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const msg = error.response?.data?.error;
      throw new Error(typeof msg === 'string' ? msg : 'Login failed');
    }
  },

  signup: async (signupData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/signup', signupData);
      localStorage.setItem('houserush_token', data.token);
      localStorage.setItem('houserush_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const msg = error.response?.data?.error;
      throw new Error(typeof msg === 'string' ? msg : 'Signup failed');
    }
  },

  logout: () => {
    localStorage.removeItem('houserush_token');
    localStorage.removeItem('houserush_user');
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem('houserush_token');
    if (!token) return;
    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('houserush_user', JSON.stringify(data));
      set({ user: data, token });
    } catch {
      localStorage.removeItem('houserush_token');
      localStorage.removeItem('houserush_user');
      set({ user: null, token: null });
    }
  },
}));
