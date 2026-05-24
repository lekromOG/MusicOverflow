import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const userAPI = {
  getUsers: () => api.get('/users'),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

export const profileAPI = {
  getProfile: (id) => api.get(`/users/${id}`),
  getUserSongs: (id) => api.get(`/users/${id}/songs`),
  getUserPlaylists: (id) => api.get(`/users/${id}/playlists`),
  getUserReposts: (id) => api.get(`/users/${id}/reposts`),
  updateProfile: (id, data) => api.put(`/users/${id}`, data),
  uploadProfilePicture: (id, formData) =>
    api.post(`/users/${id}/profile-picture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadBanner: (id, formData) =>
    api.post(`/users/${id}/banner`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default api;
