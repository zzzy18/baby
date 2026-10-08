/**
 * API 服务层：统一管理所有后端请求，并自动附加设备本地持久化 Token
 */

// 如果未配置环境变量，本地开发默认 http://localhost:8000，同域部署时为空字符串
const BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '')

export const TOKEN_STORAGE_KEY = 'baby_access_token'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || ''
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

async function request(path, options = {}) {
  const token = getStoredToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    // 触发全局未授权事件，自动弹出输入密码界面
    window.dispatchEvent(new CustomEvent('baby-auth-unauthorized'))
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || '访问口令未验证或已失效')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `请求失败 ${res.status}`)
  }

  return res.json()
}

// ===== 登录与鉴权 =====
export const authApi = {
  login: async (accessCode) => {
    const code = (accessCode || '').trim()
    try {
      const data = await request('/api/login', {
        method: 'POST',
        body: JSON.stringify({ access_code: code }),
      })
      if (data.token) {
        setStoredToken(data.token)
      }
      return data
    } catch (err) {
      // 本地开发备用容错：若本地后端未连通，标准口令 baby888 也直接通过进入体验
      if (code === 'baby888') {
        setStoredToken('baby888')
        return { ok: true, token: 'baby888' }
      }
      throw err
    }
  },
  verify: () => request('/api/verify'),
  logout: () => setStoredToken(''),
}

// ===== 喂奶记录 =====
export const feedingApi = {
  list: (limit = 50) => request(`/feeding?limit=${limit}`),
  add: (data) => request('/feeding', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id) => request(`/feeding/${id}`, { method: 'DELETE' }),
  stats: () => request('/feeding/stats'),
}

// ===== 换尿布记录 =====
export const diaperApi = {
  list: (limit = 50) => request(`/diaper?limit=${limit}`),
  add: (data) => request('/diaper', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id) => request(`/diaper/${id}`, { method: 'DELETE' }),
  stats: () => request('/diaper/stats'),
}

// ===== 睡眠记录 =====
export const sleepApi = {
  list: (limit = 50) => request(`/sleep?limit=${limit}`),
  add: (data) => request('/sleep', { method: 'POST', body: JSON.stringify(data) }),
  end: (id) => request(`/sleep/${id}/end`, { method: 'PATCH' }),
  remove: (id) => request(`/sleep/${id}`, { method: 'DELETE' }),
  stats: () => request('/sleep/stats'),
}

// ===== 母乳存储 =====
export const milkApi = {
  listStorage: (includeUsed = false) =>
    request(`/milk/storage?include_used=${includeUsed}`),
  addStorage: (data) => request('/milk/storage', { method: 'POST', body: JSON.stringify(data) }),
  useStorage: (id) => request(`/milk/storage/${id}/use`, { method: 'PATCH' }),
  removeStorage: (id) => request(`/milk/storage/${id}`, { method: 'DELETE' }),
  storageStats: () => request('/milk/stats'),
  listPump: (limit = 50) => request(`/milk/pump?limit=${limit}`),
  addPump: (data) => request('/milk/pump', { method: 'POST', body: JSON.stringify(data) }),
  removePump: (id) => request(`/milk/pump/${id}`, { method: 'DELETE' }),
}

// ===== 宝宝档案（跨设备共享） =====
export const babyApi = {
  getProfile: () => request('/baby/profile'),
  updateProfile: (data) => request('/baby/profile', { method: 'PUT', body: JSON.stringify(data) }),
}
