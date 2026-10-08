import { useState, useEffect, useCallback } from 'react'
import { diaperApi } from '../api'
import { getBeijingNowString, formatClock, formatRelativeTime } from '../dateUtils'

const DIAPER_TYPES = [
  { key: 'wet', label: '湿尿布', icon: '💧', badge: 'badge-blue' },
  { key: 'poop', label: '便便', icon: '💩', badge: 'badge-orange' },
  { key: 'mixed', label: '混合', icon: '🔄', badge: 'badge-green' },
]
const COLOR_OPTIONS = ['黄色（正常）', '绿色', '棕色', '白色', '血丝']

export default function DiaperLog() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ today_total: 0, today_wet: 0, today_poop: 0 })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [diaperType, setDiaperType] = useState('wet')
  const [diaperTime, setDiaperTime] = useState(getBeijingNowString)
  const [color, setColor] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [logsData, statsData] = await Promise.all([diaperApi.list(), diaperApi.stats()])
      setLogs(logsData)
      setStats(statsData)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openModal(type) {
    setDiaperType(type)
    setDiaperTime(getBeijingNowString()) // 刷新为当前北京时间
    setShowModal(true)
  }

  async function handleAdd() {
    setSaving(true)
    try {
      await diaperApi.add({
        diaper_type: diaperType,
        diaper_time: diaperTime,
        color,
        note,
      })
      setShowModal(false)
      setNote(''); setColor('')
      await load()
    } catch (e) { alert('保存失败：' + e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try {
      await diaperApi.remove(id)
      await load()
    } catch (e) { alert('删除失败：' + e.message) }
  }

  const typeInfo = (key) => DIAPER_TYPES.find(t => t.key === key)

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.today_total}</div>
          <div className="stat-label">今日换尿布 (0-24点)</div>
          <div className="stat-unit">次</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.today_wet}</div>
          <div className="stat-label">今日湿尿布</div>
          <div className="stat-unit">次</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.today_poop}</div>
          <div className="stat-label">今日便便</div>
          <div className="stat-unit">次</div>
        </div>
      </div>

      <div className="quick-btn-grid">
        {DIAPER_TYPES.map(t => (
          <button key={t.key}
            className={`quick-btn ${t.key === 'wet' ? 'blue' : t.key === 'poop' ? 'orange' : 'green'}`}
            onClick={() => openModal(t.key)}>
            <span className="btn-icon">{t.icon}</span>
            <span className="btn-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="tip-text" style={{ marginBottom: 12 }}>
        💡 新生儿每天换尿布 <strong>8-12次</strong> 是正常的，今天已换 <strong>{stats.today_total}</strong> 次
      </div>

      <div className="section-title">最近记录</div>
      {loading ? (
        <div className="empty-state"><div className="empty-icon">⏳</div><p>加载中...</p></div>
      ) : (
        <div className="log-list">
          {logs.length === 0 && (
            <div className="empty-state"><div className="empty-icon">🌟</div><p>还没有记录</p></div>
          )}
          {logs.map(log => {
            const t = typeInfo(log.diaper_type)
            return (
              <div className="log-item" key={log.id}>
                <div className="log-icon">{t.icon}</div>
                <div className="log-info">
                  <div className="log-main">{t.label}</div>
                  <div className="log-sub">
                    <span className={`badge ${t.badge}`}>{t.label}</span>
                    {log.color && <span style={{ marginLeft: 6, fontSize: 12, color: '#aaa' }}>{log.color}</span>}
                    {log.note && <span style={{ marginLeft: 6, fontSize: 12, color: '#aaa' }}>{log.note}</span>}
                  </div>
                </div>
                <div className="log-time">
                  <div>{formatClock(log.diaper_time)}</div>
                  <div style={{ marginTop: 2, color: '#ccc' }}>{formatRelativeTime(log.diaper_time)}</div>
                  <button onClick={() => handleDelete(log.id)}
                    style={{ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ccc' }}>🗑</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">💧 换尿布记录</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">类型</label>
              <div className="toggle-group">
                {DIAPER_TYPES.map(t => (
                  <button key={t.key} className={`toggle-btn ${diaperType === t.key ? 'active' : ''}`}
                    onClick={() => setDiaperType(t.key)}>{t.icon} {t.label}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">时间（北京时间）</label>
              <input type="datetime-local" className="form-input" value={diaperTime} onChange={e => setDiaperTime(e.target.value)} />
            </div>
            {(diaperType === 'poop' || diaperType === 'mixed') && (
              <div className="form-group">
                <label className="form-label">便便颜色（可选）</label>
                <div className="side-option-group">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} className={`side-option ${color === c ? 'selected' : ''}`}
                      onClick={() => setColor(color === c ? '' : c)}>{c}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">备注（可选）</label>
              <input type="text" className="form-input" placeholder="例如：皮肤有点红" value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div className="btn-row">
              <button className="btn-outline" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleAdd} disabled={saving}>{saving ? '保存中...' : '✓ 保存记录'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
