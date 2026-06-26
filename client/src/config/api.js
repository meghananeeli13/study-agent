import axios from 'axios'
import { auth } from './firebase'

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
})

api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser
    if (user) {
      const token = await user.getIdToken(true)
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (error) {
    console.error('Token error:', error)
  }
  return config
})

export default api