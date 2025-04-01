import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';

interface User {
  id: number;
  name: string;
  passCode: string;
  role: string; // Добавляем поле роли
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => {
        // Устанавливаем данные пользователя в localStorage через Zustand persist
        set({ user, isAuthenticated: true });
        
        // Создаем токен в формате, который ожидает сервер (base64 encoded JSON)
        const token = Buffer.from(JSON.stringify(user)).toString("base64");
        
        // Устанавливаем токен в localStorage для клиентской проверки
        localStorage.setItem('auth_token', token);
        
        // Устанавливаем токен в cookie для серверной проверки
        Cookies.set('auth_token', token, { expires: 7 }); // срок действия 7 дней
      },
      logout: () => {
        // Очищаем данные пользователя в Zustand
        set({ user: null, isAuthenticated: false });
        
        // Удаляем токен из localStorage
        localStorage.removeItem('auth_token');
        
        // Удаляем токен из cookie
        Cookies.remove('auth_token');
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
