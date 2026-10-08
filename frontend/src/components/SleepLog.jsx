import { useState, useEffect, useCallback } from 'react'
import { sleepApi } from '../api'
import { getBeijingNowString, formatClock, parseBeijingDate } from '../dateUtils'

function getDuration(startStr, endStr) {
  const start = parseBeijingDate(startStr)
  const end = parseBeijingDate(endStr)
  const mins = Math.floor((end - start) / 60000)
  const h = Math.floor(mins / 60), m = mins % 60
  if (h === 0) return `${m}分钟`
  return m > 0 ? `${h}小时${m}分` : `${h}小时`
}

export default function SleepLog() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ today_total_mins: 0, today_count: 0, meets_recommendation: false })
  const [loading, setLoading] = useState(true)
  const [activeSleepId, setActiveSleepId] = useState(null)
  const [sleepStart, setSleepStart] = useState(null)
  const [sleepType, setSleepType] = useState('nap')
  const [showModal, setShowModal] = useState(false)
  const [manualStart, setManualStart] = useState(getBeijingNowString)
  const [manualEnd, setManualEnd] = useState(getBeijingNowString)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [logsData, statsData] = await Promise.all([sleepApi.list(), sleepApi.stats()])
      setLogs(logsData)
      setStats(statsData)
      const active = logsData.find(l => !l.end_time)
      if (active) {
        setActiveSleepId(active.id)
        setSleepStart(active.start_time)
      } else {
        setActiveSleepId(null)
        setSleepStart(null)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openManualModal() {
    const bjNow = getBeijingNowString()
    setManualStart(bjNow)
    setManualEnd(bjNow)
    setShowModal(true)
  }

  async function startSleep() {
    setSaving(true)
    try {
      const bjNow = getBeijingNowString()
      const log = await sleepApi.add({
        sleep_type: sleepType,
        start_time: bjNow,
        end_time: null,
        note: '',
      })
      setActiveSleepId(log.id)
      setSleepStart(log.start_time)
      await load()
    } catch (e) { alert('保存失败：' + e.message) }
    finally { setSaving(false) }
  }

  async function stopSleep() {
    if (!activeSleepId) return
    setSaving(true)
    try {
      await sleepApi.end(activeSleepId)
      setActiveSleepId(null)
      setSleepStart(null)
      await load()
    } catch (e) { alert('操作失败：' + e.message) }
    finally { setSaving(false) }
  }

  async function handleManualAdd() {
    setSaving(true)
    try {
      await sleepApi.add({
        sleep_type: sleepType,
        start_time: manualStart,
        end_time: manualEnd,
        note: '',
      })
      setShowModal(false)
      await load()
    } catch (e) { alert('保存失败：' + e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try {
      await sleepApi.remove(id)
      await load()
    } catch (e) { alert('删除失败：' + e.message) }
  }

  const totalH = Math.floor(stats.today_total_mins / 60)
  const totalM = stats.today_total_mins % 60

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{totalH}</div>
          <div className="stat-label">今日睡眠 (0-24点)</div>
          <div className="stat-unit">小时 {totalM > 0 ? `${totalM}分` : ''}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.today_count}</div>
          <div className="stat-label">今日睡眠次数</div>
          <div className="stat-unit">次</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.meets_recommendation ? '#2ecc71' : '#e74c3c' }}>
            {stats.meets_recommendation ? '✓' : '↑'}
          </div>
          <div className="stat-label">建议14h+</div>
          <div className="stat-unit">{stats.meets_recommendation ? '达标' : '未达标'}</div>
        </div>
      </div>

      {/* 计时器 */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="card-title" style={{ justifyContent: 'center' }}>⏱ 实时计时</div>
        {activeSleepId ? (
          <>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>
              入睡时间：{sleepStart ? formatClock(sleepStart) : '--'}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary-dark)', margin: '8px 0' }}>
              😴 睡眠中...
            </div>
            <button className="btn-primary" onClick={stopSleep} disabled={saving} style={{ marginTop: 8 }}>
              {saving ? '处理中...' : '☀️ 醒了，停止计时'}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>点击开始，自动记录睡眠时长</div>
            <div className="toggle-group" style={{ marginBottom: 12 }}>
              <button className={`toggle-btn ${sleepType === 'nap' ? 'active' : ''}`} onClick={() => setSleepType('nap')}>🌤 白天小睡</button>
              <button className={`toggle-btn ${sleepType === 'night' ? 'active' : ''}`} onClick={() => setSleepType('night')}>🌙 夜间睡眠</button>
            </div>
            <div className="btn-row">
              <button className="btn-primary" onClick={startSleep} disabled={saving}>{saving ? '处理中...' : '🌙 宝宝睡着了'}</button>
              <button className="btn-outline" onClick={openManualModal}>手动添加</button>
            </div>
          </>
        )}
      </div>

      <div className="section-title">睡眠记录</div>
      {loading ? (
        <div className="empty-state"><div className="empty-icon">⏳</div><p>加载中...</p></div>
      ) : (
        <div className="log-list">
          {logs.length === 0 && (
            <div className="empty-state"><div className="empty-icon">😴</div><p>还没有记录</p></div>
          )}
          {logs.map(log => (
            <div className="log-item" key={log.id}>
              <div className="log-icon">{log.sleep_type === 'night' ? '🌙' : '🌤'}</div>
              <div className="log-info">
                <div className="log-main">
                  {formatClock(log.start_time)} → {log.end_time ? formatClock(log.end_time) : '睡眠中...'}
                </div>
                <div className="log-sub">
                  <span className={`badge ${log.sleep_type === 'night' ? 'badge-blue' : 'badge-orange'}`}>
                    {log.sleep_type === 'night' ? '夜间睡眠' : '白天小睡'}
                  </span>
                  {log.end_time && (
                    <span style={{ marginLeft: 6, fontSize: 12, color: '#aaa' }}>
                      共 {getDuration(log.start_time, log.end_time)}
                    </span>
                  )}
                </div>
              </div>
              <div className="log-time">
                {!log.end_time && <span className="badge badge-green">进行中</span>}
                <button onClick={() => handleDelete(log.id)}
                  style={{ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ccc' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">😴 手动添加睡眠</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">类型</label>
              <div className="toggle-group">
                <button className={`toggle-btn ${sleepType === 'nap' ? 'active' : ''}`} onClick={() => setSleepType('nap')}>🌤 白天小睡</button>
                <button className={`toggle-btn ${sleepType === 'night' ? 'active' : ''}`} onClick={() => setSleepType('night')}>🌙 夜间睡眠</button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">入睡时间（北京时间）</label>
              <input type="datetime-local" className="form-input" value={manualStart} onChange={e => setManualStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">醒来时间（北京时间）</label>
              <input type="datetime-local" className="form-input" value={manualEnd} onChange={e => setManualEnd(e.target.value)} />
            </div>
            <div className="btn-row">
              <button className="btn-outline" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleManualAdd} disabled={saving}>{saving ? '保存中...' : '✓ 保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
