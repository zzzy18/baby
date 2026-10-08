import { useState, useEffect, useCallback } from 'react'
import { feedingApi } from '../api'
import { getBeijingNowString, formatClock, formatRelativeTime } from '../dateUtils'

export default function FeedingLog({ onGoAnalytics }) {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ today_count: 0, avg_interval_hours: null, mins_since_last: null })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [feedType, setFeedType] = useState('breast')
  const [side, setSide] = useState('左侧')
  const [duration, setDuration] = useState('')
  const [amount, setAmount] = useState('')
  const [feedTime, setFeedTime] = useState(getBeijingNowString)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [logsData, statsData] = await Promise.all([
        feedingApi.list(),
        feedingApi.stats(),
      ])
      setLogs(logsData)
      setStats(statsData)
    } catch (e) {
      console.error('加载失败', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openModal(type) {
    setFeedType(type)
    setFeedTime(getBeijingNowString()) // 每次打开弹窗刷新为当前最新的北京时间
    setShowModal(true)
  }

  async function handleAdd() {
    setSaving(true)
    try {
      await feedingApi.add({
        feed_type: feedType,
        side: feedType === 'breast' ? side : null,
        duration_mins: feedType === 'breast' ? parseInt(duration) || null : null,
        amount_ml: feedType === 'bottle' ? parseFloat(amount) || null : null,
        feed_time: feedTime,
        note: '',
      })
      setShowModal(false)
      setDuration('')
      setAmount('')
      await load()
    } catch (e) {
      alert('保存失败：' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await feedingApi.remove(id)
      setLogs(logs.filter(l => l.id !== id))
      await feedingApi.stats().then(setStats)
    } catch (e) {
      alert('删除失败：' + e.message)
    }
  }

  const minsSince = stats.mins_since_last
  const sinceStr = minsSince == null ? '--'
    : minsSince >= 60 ? `${Math.floor(minsSince / 60)}h${minsSince % 60}m`
    : `${minsSince}m`

  return (
    <div>
      {/* 今日统计（北京时间 0点-24点） */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.today_count}</div>
          <div className="stat-label">今日喂奶 (0-24点)</div>
          <div className="stat-unit">次</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avg_interval_hours ?? '--'}</div>
          <div className="stat-label">今日平均间隔</div>
          <div className="stat-unit">小时</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 16 }}>{sinceStr}</div>
          <div className="stat-label">距上次喂奶</div>
          <div className="stat-unit">已过去</div>
        </div>
      </div>

      {/* 近期深度喂养报告入口 */}
      {onGoAnalytics && (
        <div className="analytics-banner" onClick={onGoAnalytics}>
          <div className="banner-left">
            <span className="banner-icon">📊</span>
            <div>
              <div className="banner-title">近期宝宝喂养多维分析报告</div>
              <div className="banner-sub">查看近7/14/30天喂哺趋势、昼夜节律与规律度</div>
            </div>
          </div>
          <span className="banner-arrow">➔</span>
        </div>
      )}

      {/* 快速记录 */}
      <div className="quick-btn-grid">
        <button className="quick-btn" onClick={() => openModal('breast')}>
          <span className="btn-icon">🤱</span>
          <span className="btn-label">母乳喂养</span>
        </button>
        <button className="quick-btn blue" onClick={() => openModal('bottle')}>
          <span className="btn-icon">🍼</span>
          <span className="btn-label">奶瓶喂养</span>
        </button>
      </div>

      {/* 提示 */}
      {stats.avg_interval_hours ? (
        <div className="tip-text" style={{ marginBottom: 12 }}>
          💡 宝宝今天平均每 <strong>{stats.avg_interval_hours}h</strong> 喂奶一次，今天已喂 <strong>{stats.today_count}</strong> 次
        </div>
      ) : stats.today_count === 1 ? (
        <div className="tip-text" style={{ marginBottom: 12 }}>
          💡 今天已记录 1 次喂奶，记录下一次后即可自动分析喂奶间隔规律
        </div>
      ) : null}

      {/* 历史记录 */}
      <div className="section-title">最近记录</div>
      {loading ? (
        <div className="empty-state"><div className="empty-icon">⏳</div><p>加载中...</p></div>
      ) : (
        <div className="log-list">
          {logs.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🍼</div>
              <p>还没有记录，点击上方按钮开始</p>
            </div>
          )}
          {logs.map(log => (
            <div className="log-item" key={log.id}>
              <div className="log-icon">{log.feed_type === 'breast' ? '🤱' : '🍼'}</div>
              <div className="log-info">
                <div className="log-main">
                  {log.feed_type === 'breast'
                    ? `母乳 · ${log.side ?? ''} · ${log.duration_mins ?? '--'}分钟`
                    : `奶瓶 · ${log.amount_ml ?? '--'}ml`}
                </div>
                <div className="log-sub">
                  <span className={`badge ${log.feed_type === 'breast' ? 'badge-pink' : 'badge-blue'}`}>
                    {log.feed_type === 'breast' ? '母乳' : '奶瓶'}
                  </span>
                </div>
              </div>
              <div className="log-time">
                <div>{formatClock(log.feed_time)}</div>
                <div style={{ marginTop: 2, color: '#ccc' }}>{formatRelativeTime(log.feed_time)}</div>
                <button onClick={() => handleDelete(log.id)}
                  style={{ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ccc' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 弹窗 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{feedType === 'breast' ? '🤱 母乳记录' : '🍼 奶瓶记录'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="toggle-group">
              <button className={`toggle-btn ${feedType === 'breast' ? 'active' : ''}`} onClick={() => setFeedType('breast')}>🤱 母乳</button>
              <button className={`toggle-btn ${feedType === 'bottle' ? 'active' : ''}`} onClick={() => setFeedType('bottle')}>🍼 奶瓶</button>
            </div>

            {feedType === 'breast' && (
              <div className="form-group">
                <label className="form-label">喂奶侧</label>
                <div className="side-option-group">
                  {['左侧', '右侧', '双侧'].map(s => (
                    <button key={s} className={`side-option ${side === s ? 'selected' : ''}`} onClick={() => setSide(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">时间（北京时间）</label>
              <input type="datetime-local" className="form-input" value={feedTime} onChange={e => setFeedTime(e.target.value)} />
            </div>

            {feedType === 'breast' ? (
              <div className="form-group">
                <label className="form-label">时长（分钟）</label>
                <input type="number" className="form-input" placeholder="例如：15" value={duration} onChange={e => setDuration(e.target.value)} />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">奶量（ml）</label>
                <input type="number" className="form-input" placeholder="例如：80" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            )}

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
