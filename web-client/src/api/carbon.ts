import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login if needed
      localStorage.removeItem('authToken');
      window.dispatchEvent(new Event('auth-expired'));
    }
    return Promise.reject(error);
  }
);

// Carbon Credit APIs
export const carbonAPI = {
  /**
   * Store carbon credits for current route
   */
  storeCarbonCredits: async (route: any, carbonSaved: number, distance: number) => {
    try {
      const response = await apiClient.post('/carbon/store', {
        route,
        carbonSaved,
        distance
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get all carbon credits for authenticated user
   */
  getUserCarbonCredits: async () => {
    try {
      const response = await apiClient.get('/carbon/user');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get user statistics
   */
  getUserStats: async () => {
    try {
      const response = await apiClient.get('/carbon/stats');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }
};

// Auth APIs (for reference)
export const authAPI = {
  /**
   * Signup new user
   */
  signup: async (name: string, email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/signup', {
        name,
        email,
        password
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  },

  /**
   * Login user
   */
  login: async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  },

  /**
   * Verify token
   */
  verifyToken: async (token: string) => {
    try {
      const response = await apiClient.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error;
    }
  }
};

export default apiClient;
