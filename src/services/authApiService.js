// services/authApiService.js
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/auth';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('jwtToken');
  if (token) config.headers.Authorization = `Bearer ${token} `;
  return config;
});

export const authApiService = {
  login: (credentials) => api.post('/login', credentials),

  getCurrentUser: () => api.get('/me')
    .then(res => {
      const user = res.data.data;
        
      console.log(user);
      // Normalize roles for frontend
      const roles = user.roles || [];
      return {
        ...user,
        isStudent: roles.some(r => r.name === 'ROLE_STUDENT'),
        isMentor:  roles.some(r => r.name === 'ROLE_MENTOR'),
        userId: user.id,
        studentId: user.student?.id || user.id,
        mentorId: user.mentor?.id || user.id
      };
    })
};