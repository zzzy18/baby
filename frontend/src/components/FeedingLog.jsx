import { useState, useEffect, useCallback, useMemo } from 'react'
import { feedingApi } from '../api'
import { getBeijingNowString, formatClock, formatRelativeTime } from '../dateUtils'
import { getBabyProfile, calculateBabyAge, getRecommendedFeedingMetrics } from '../mockData/babyProfile'

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

  // 宝宝档案与月龄/体重生理参数推算
  const babyProfile = useMemo(() => getBabyProfile(), [])
  const babyAge = useMemo(() => calculateBabyAge(babyProfile.birthday), [babyProfile])
  const metrics = useMemo(
    () => getRecommendedFeedingMetrics(babyProfile.weightKg, babyAge.totalDays),
    [babyProfile, babyAge]
  )

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

  // 计算今日已喝奶瓶总量
  const todayBottleTotal = useMemo(() => {
    return logs
      .filter(l => l.feed_type === 'bottle' && l.amount_ml)
      .reduce((acc, cur) => acc + (cur.amount_ml || 0), 0)
  }, [logs])

  const intakePercent = Math.min(100, Math.round((todayBottleTotal / metrics.standardDaily) * 100))

  const minsSince = stats.mins_since_last
  const sinceStr = minsSince == null ? '--'
    : minsSince >= 60 ? `${Math.floor(minsSince / 60)}h${minsSince % 60}m`
    : `${minsSince}m`

  const parsedAmount = parseFloat(amount) || 0
  const isAmountOver = parsedAmount > metrics.maxPerFeed * 1.35
  const isAmountUnder = parsedAmount > 0 && parsedAmount < metrics.minPerFeed * 0.6
  const parsedDuration = parseInt(duration) || 0
  const isDurationOver = parsedDuration > 35

  return (
    <div>
      {/* 宝宝月龄与体重信息卡片 */}
      <div className="baby-profile-bar">
        <div className="profile-bar-avatar">👶</div>
        <div className="profile-bar-info">
          <div className="profile-bar-name">
            <strong>{babyProfile.name}</strong> · {babyAge.ageText}
          </div>
          <div className="profile-bar-sub">
            当前体重 <strong>{babyProfile.weightKg} kg</strong> · 每日推荐奶量 <strong>{metrics.minDaily}-{metrics.standardDaily} ml</strong>
          </div>
        </div>
      </div>

      {/* 今日统计（北京时间 0点-24点） */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.today_count}</div>
          <div className="stat-label">今日喂奶 (0-24点)</div>
          <div className="stat-unit">次 · 建议{metrics.suggestedFrequency}</div>
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

      {/* 今日奶量目标完成度 */}
      <div className="card intake-progress-card">
        <div className="intake-progress-header">
          <span>🍼 今日奶瓶摄入：<strong>{todayBottleTotal} ml</strong></span>
          <span className="intake-target">体重基准线: {metrics.standardDaily} ml ({intakePercent}%)</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${intakePercent}%`,
              background: intakePercent >= 90 ? '#2ecc71' : 'linear-gradient(90deg, #fbc2eb 0%, #a6c1ee 100%)',
            }}
          ></div>
        </div>
      </div>

      {/* 近期深度喂养报告入口 */}
      {onGoAnalytics && (
        <div className="analytics-banner" onClick={onGoAnalytics}>
          <div className="banner-left">
            <span className="banner-icon">📊</span>
            <div>
              <div className="banner-title">近期宝宝喂养多维分析报告</div>
              <div className="banner-sub">结合 {babyProfile.weightKg}kg 体重与月龄对比 WHO 生长曲线标准</div>
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

      {/* 弹窗：深度融合宝宝月龄与体重参数 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{feedType === 'breast' ? '🤱 母乳记录' : '🍼 奶瓶记录'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* 月龄体重上下文标签 */}
            <div className="modal-baby-context">
              <span>👶 {babyProfile.name}</span>
              <span>📅 {babyAge.ageText}</span>
              <span>⚖️ {babyProfile.weightKg} kg</span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0 }}>时长（分钟）</label>
                  <span style={{ fontSize: 11, color: 'var(--primary-dark)' }}>
                    建议单侧：{metrics.recommendedBreastMins}
                  </span>
                </div>
                <input
                  type="number"
                  className="form-input"
                  placeholder="例如：15"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                />
                {/* 快速时长胶囊 */}
                <div className="quick-chips">
                  {[10, 15, 20, 25, 30].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      className="chip-btn"
                      onClick={() => setDuration(String(mins))}
                    >
                      {mins}分
                    </button>
                  ))}
                </div>
                {isDurationOver && (
                  <div className="modal-warning-tip">
                    ⚠️ 单侧亲喂超过 35 分钟，可能存在含乳较浅、无效吞咽或单纯哄睡，建议注意乳头保护并防疲劳。
                  </div>
                )}
              </div>
            ) : (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0 }}>奶量（ml）</label>
                  <span style={{ fontSize: 11, color: '#4a9eff' }}>
                    单次建议参考：{metrics.minPerFeed} ~ {metrics.maxPerFeed} ml
                  </span>
                </div>
                <input
                  type="number"
                  className="form-input"
                  placeholder={`参考区间 ${metrics.minPerFeed}-${metrics.maxPerFeed}`}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                {/* 快速容量胶囊 */}
                <div className="quick-chips">
                  {[60, 80, 100, 120, 140, 160].map(ml => (
                    <button
                      key={ml}
                      type="button"
                      className={`chip-btn ${parsedAmount === ml ? 'active' : ''}`}
                      onClick={() => setAmount(String(ml))}
                    >
                      {ml}ml
                    </button>
                  ))}
                </div>
                {isAmountOver && (
                  <div className="modal-warning-tip">
                    ⚠️ 输入奶量 ({parsedAmount}ml) 高出当前月龄单餐胃容量参考上限 ({metrics.maxPerFeed}ml)，注意喂后充分竖抱拍嗝，警惕过度喂养与吐奶。
                  </div>
                )}
                {isAmountUnder && (
                  <div className="modal-warning-tip" style={{ color: '#e67e22', background: '#fff8f0' }}>
                    💡 单次奶量偏少，可能属于加餐或零食奶，注意观察宝宝是否在 1.5 小时内再次频繁索食。
                  </div>
                )}
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
