import { apiService } from './api';
import { LoginCredentials, RegisterData, User, ApiResponse } from '../types/auth';

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await apiService.post<ApiResponse<AuthResponse>>('/users/login', credentials);
      
      if (response.success && response.data) {
        // Store token and user in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  async register(userData: RegisterData): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await apiService.post<ApiResponse<AuthResponse>>('/users/register', userData);
      
      if (response.success && response.data) {
        // Store token and user in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    try {
      return await apiService.get<ApiResponse<{ user: User }>>('/users/profile');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get profile');
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getStoredToken(): string | null {
    return localStorage.getItem('token');
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }
}

export const authService = new AuthService();