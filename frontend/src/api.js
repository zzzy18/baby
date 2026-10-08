/**
 * API 服务层：统一管理所有后端请求
 */

// 如果未配置环境变量，本地开发默认 http://localhost:8000，同域部署时可为空字符串
const BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '')

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `请求失败 ${res.status}`)
  }
  return res.json()
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
