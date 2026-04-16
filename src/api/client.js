import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
})

// Attach token from storage on each request if not already set
api.interceptors.request.use((config) => {
  if (!config.headers['Authorization']) {
    const token = localStorage.getItem('fr_token')
    if (token) config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

export default api
