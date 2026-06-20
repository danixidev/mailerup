import axios from 'axios'

const api = axios.create({ baseURL: '/api', withCredentials: true })

// No request interceptor needed — HttpOnly cookies are sent automatically by the browser

let refreshing = null
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry && !err.config._skipRetry) {
      err.config._retry = true
      if (!refreshing) {
        refreshing = axios
          .post('/api/auth/token/refresh/', {}, { withCredentials: true })
          .then(() => true)
          .catch(() => {
            if (window.location.pathname !== '/login') {
              window.location.href = '/login'
            }
            return false
          })
          .finally(() => { refreshing = null })
      }
      const ok = await refreshing
      if (ok) return api.request(err.config)
    }
    return Promise.reject(err)
  }
)

export default api
