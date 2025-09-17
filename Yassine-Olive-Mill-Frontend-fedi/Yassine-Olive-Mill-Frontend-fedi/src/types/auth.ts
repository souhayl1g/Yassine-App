export interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  phone?: string;
  role: 'admin' | 'operator' | 'scanner' | 'manager' | 'employee' | string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export interface SignupData {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  phone?: string;
  role?: 'admin' | 'operator' | 'scanner';
}

export interface LoginCredentials {
  email: string;
  password: string;
}