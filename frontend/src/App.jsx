import { useState, useEffect } from 'react'
import './App.css'
import FeedingLog from './components/FeedingLog'
import DiaperLog from './components/DiaperLog'
import SleepLog from './components/SleepLog'
import MilkStorage from './components/MilkStorage'
import { authApi, getStoredToken, setStoredToken } from './api'

const TABS = [
  { key: 'feeding', label: '喂奶', icon: '🍼', title: '喂奶记录', subtitle: '追踪宝宝每次进食' },
  { key: 'diaper', label: '尿布', icon: '💧', title: '换尿布', subtitle: '记录大小便情况' },
  { key: 'sleep', label: '睡眠', icon: '😴', title: '睡眠记录', subtitle: '分析宝宝睡眠规律' },
  { key: 'milk', label: '母乳', icon: '🥛', title: '母乳存储', subtitle: '管理库存与有效期' },
]

export default function App() {
  const [isAuthed, setIsAuthed] = useState(() => Boolean(getStoredToken()))
  const [accessCode, setAccessCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('feeding')

  // 监听来自 API 层的未授权事件（例如口令在服务端被重置）
  useEffect(() => {
    function handleUnauthorized() {
      setIsAuthed(false)
      setStoredToken('')
      setErrorMsg('访问口令已失效，请重新输入')
    }
    window.addEventListener('baby-auth-unauthorized', handleUnauthorized)
    return () => window.removeEventListener('baby-auth-unauthorized', handleUnauthorized)
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    if (!accessCode.trim()) {
      setErrorMsg('请输入访问口令')
      return
    }
    setSubmitting(true)
    setErrorMsg('')
    try {
      await authApi.login(accessCode.trim())
      setIsAuthed(true)
      setAccessCode('')
    } catch (err) {
      setErrorMsg(err.message || '验证失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  function handleLogout() {
    if (window.confirm('确定要锁定此设备吗？下次访问需重新输入口令。')) {
      authApi.logout()
      setIsAuthed(false)
      setErrorMsg('')
    }
  }

  // ===== 未登录：显示访问门禁卡片 =====
  if (!isAuthed) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">👶</div>
          <h2>宝宝成长空间</h2>
          <p className="login-desc">
            为保护宝宝数据隐私，请先输入访问口令
            <br />
            <span>（当前设备仅需输入一次，后续自动保持免登）</span>
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="form-input login-input"
              placeholder="请输入访问口令"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
              autoFocus
            />
            {errorMsg && <div className="login-error">⚠️ {errorMsg}</div>}
            <button
              type="submit"
              className="btn-primary login-btn"
              disabled={submitting}
            >
              {submitting ? '验证中...' : '🔑 验证进入'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const currentTab = TABS.find(t => t.key === activeTab)

  function renderContent() {
    switch (activeTab) {
      case 'feeding': return <FeedingLog />
      case 'diaper': return <DiaperLog />
      case 'sleep': return <SleepLog />
      case 'milk': return <MilkStorage />
      default: return null
    }
  }

  return (
    <>
      {/* 顶部标题栏 */}
      <div className="top-bar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>{currentTab.icon} {currentTab.title}</h1>
            <div className="subtitle">{currentTab.subtitle}</div>
          </div>
          <button className="lock-btn" onClick={handleLogout} title="锁定设备">
            🔒 锁定设备
          </button>
        </div>
      </div>

      {/* 主内容 */}
      <div className="main-content">
        {renderContent()}
      </div>

      {/* 底部导航 */}
      <nav className="bottom-nav">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="icon">{tab.icon}</span>
            <span className="label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
