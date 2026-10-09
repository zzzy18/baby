import { useState, useEffect } from 'react'
import './App.css'
import FeedingLog from './components/FeedingLog'
import DiaperLog from './components/DiaperLog'
import SleepLog from './components/SleepLog'
import MilkStorage from './components/MilkStorage'
import FeedingAnalytics from './components/FeedingAnalytics'
import { authApi, babyApi, getStoredToken, setStoredToken } from './api'
import { getBabyProfile, saveBabyProfile, calculateBabyAge } from './mockData/babyProfile'

const TABS = [
  { key: 'feeding', label: '喂奶', icon: '🍼', title: '喂奶记录', subtitle: '追踪宝宝每次进食' },
  { key: 'diaper', label: '尿布', icon: '💧', title: '换尿布', subtitle: '记录大小便情况' },
  { key: 'sleep', label: '睡眠', icon: '😴', title: '睡眠记录', subtitle: '分析宝宝睡眠规律' },
  { key: 'milk', label: '母乳', icon: '🥛', title: '母乳存储', subtitle: '管理库存与有效期' },
  { key: 'analytics', label: '统计', icon: '📊', title: '喂养多维分析', subtitle: '结合月龄与体重医学对标' },
]

export default function App() {
  const [isAuthed, setIsAuthed] = useState(() => Boolean(getStoredToken()))
  const [accessCode, setAccessCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('feeding')

  // 宝宝档案状态
  const [babyProfile, setBabyProfile] = useState(() => getBabyProfile())
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [editName, setEditName] = useState(babyProfile.name)
  const [editBirthday, setEditBirthday] = useState(babyProfile.birthday)
  const [editWeight, setEditWeight] = useState(String(babyProfile.weightKg))

  const babyAge = calculateBabyAge(babyProfile.birthday)

  // 跨设备同步：获取云端共享的宝宝档案
  useEffect(() => {
    if (!isAuthed) return
    babyApi.getProfile()
      .then(serverProfile => {
        if (serverProfile) {
          const synced = {
            name: serverProfile.name || '悠悠',
            gender: serverProfile.gender || 'girl',
            birthday: serverProfile.birthday || '2026-08-24',
            weightKg: (serverProfile.weight_kg !== undefined && serverProfile.weight_kg !== null)
              ? serverProfile.weight_kg 
              : 4.6,
            headCircumferenceCm: serverProfile.head_circumference_cm,
            heightCm: serverProfile.height_cm,
          }
          setBabyProfile(synced)
          saveBabyProfile(synced)
        }
      })
      .catch(err => {
        console.warn('获取云端宝宝档案失败，使用本地缓存:', err)
      })
  }, [isAuthed])

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

  async function handleSaveProfile(e) {
    e.preventDefault()
    const newProfile = {
      ...babyProfile,
      name: editName.trim() || '宝宝',
      birthday: editBirthday,
      weightKg: parseFloat(editWeight) || 4.5,
    }
    // 本地优先响应并缓存
    setBabyProfile(newProfile)
    saveBabyProfile(newProfile)
    setShowProfileModal(false)

    // 跨设备云端持久化
    try {
      await babyApi.updateProfile({
        name: newProfile.name,
        gender: newProfile.gender || 'girl',
        birthday: newProfile.birthday,
        weight_kg: newProfile.weightKg,
        head_circumference_cm: newProfile.headCircumferenceCm,
        height_cm: newProfile.heightCm,
      })
    } catch (err) {
      console.error('同步宝宝档案到云端失败:', err)
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
      case 'feeding':
        return (
          <FeedingLog
            key={babyProfile.weightKg + babyProfile.birthday}
            onGoAnalytics={() => setActiveTab('analytics')}
          />
        )
      case 'diaper': return <DiaperLog />
      case 'sleep': return <SleepLog />
      case 'milk': return <MilkStorage />
      case 'analytics':
        return (
          <FeedingAnalytics
            key={babyProfile.weightKg + babyProfile.birthday}
            babyProfile={babyProfile}
            babyAge={babyAge}
            onGoFeeding={() => setActiveTab('feeding')}
          />
        )
      default: return null
    }
  }

  return (
    <>
      {/* 顶部标题栏 */}
      <div className="top-bar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>{currentTab.icon} {currentTab.title}</h1>
            <div className="subtitle">{currentTab.subtitle}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              className="baby-profile-pill"
              onClick={() => {
                setEditName(babyProfile.name)
                setEditBirthday(babyProfile.birthday)
                setEditWeight(String(babyProfile.weightKg))
                setShowProfileModal(true)
              }}
              title="点击修改宝宝月龄与体重"
            >
              👶 {babyProfile.name} · {babyProfile.weightKg}kg ⚙️
            </button>
            <button className="lock-btn" onClick={handleLogout} title="锁定设备">
              🔒 锁定
            </button>
          </div>
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

      {/* 编辑宝宝档案弹窗 */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">👶 宝宝成长档案设置</div>
              <button className="modal-close" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label className="form-label">宝宝昵称</label>
                <input
                  type="text"
                  className="form-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="例如：悠悠"
                />
              </div>

              <div className="form-group">
                <label className="form-label">出生日期（自动计算精准日龄与月龄）</label>
                <input
                  type="date"
                  className="form-input"
                  value={editBirthday}
                  onChange={e => setEditBirthday(e.target.value)}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0 }}>当前体重 (kg)</label>
                  <span style={{ fontSize: 11, color: 'var(--primary-dark)' }}>
                    用于计算每日推荐奶量 (150ml/kg)
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={editWeight}
                  onChange={e => setEditWeight(e.target.value)}
                  placeholder="例如：4.6"
                />
              </div>

              <div className="tip-text" style={{ marginBottom: 14 }}>
                💡 修改体重或出生日期后，全应用的单次胃容量参考、每日目标线及深度医学评估将自动实时重新计算。
              </div>

              <div className="btn-row">
                <button type="button" className="btn-outline" onClick={() => setShowProfileModal(false)}>取消</button>
                <button type="submit" className="btn-primary">✓ 保存档案</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
