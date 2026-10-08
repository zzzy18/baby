import { useState, useEffect, useCallback } from 'react'
import { milkApi } from '../api'
import { getBeijingNowString, formatClock, formatFullTime, parseBeijingDate } from '../dateUtils'

const STORAGE_RULES = {
  fridge: { label: '冷藏', icon: '🧊', color: '#4a9eff', bg: '#dff0ff' },
  freezer: { label: '冷冻', icon: '❄️', color: '#9b59b6', bg: '#f0e6ff' },
  room: { label: '室温', icon: '🌡️', color: '#e67e22', bg: '#fff3e0' },
}

function getExpiryStatus(expiryStr) {
  const expiry = parseBeijingDate(expiryStr)
  const now = new Date()
  const diffHours = (expiry - now) / 3600000
  if (diffHours < 0) return { label: '已过期', badgeClass: 'badge-red' }
  if (diffHours < 24) return { label: '今日到期', badgeClass: 'badge-orange' }
  if (diffHours < 72) return { label: `${Math.floor(diffHours / 24)}天后到期`, badgeClass: 'badge-orange' }
  return { label: `${Math.floor(diffHours / 24)}天后到期`, badgeClass: 'badge-green' }
}

export default function MilkStorage() {
  const [stocks, setStocks] = useState([])
  const [pumpLogs, setPumpLogs] = useState([])
  const [stats, setStats] = useState({ fridge_total_ml: 0, freezer_total_ml: 0, room_total_ml: 0, expiring_soon_count: 0, expired_count: 0 })
  const [loading, setLoading] = useState(true)
  const [showStorageModal, setShowStorageModal] = useState(false)
  const [showPumpModal, setShowPumpModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // 存储表单
  const [amount, setAmount] = useState('')
  const [storageType, setStorageType] = useState('fridge')
  const [collectedAt, setCollectedAt] = useState(getBeijingNowString)
  const [note, setNote] = useState('')

  // 泵奶表单
  const [pumpAmount, setPumpAmount] = useState('')
  const [pumpSide, setPumpSide] = useState('双侧')
  const [pumpDuration, setPumpDuration] = useState('')
  const [pumpTime, setPumpTime] = useState(getBeijingNowString)

  const load = useCallback(async () => {
    try {
      const [storageData, pumpData, statsData] = await Promise.all([
        milkApi.listStorage(),
        milkApi.listPump(),
        milkApi.storageStats(),
      ])
      setStocks(storageData)
      setPumpLogs(pumpData)
      setStats(statsData)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openStorageModal() {
    setCollectedAt(getBeijingNowString())
    setShowStorageModal(true)
  }

  function openPumpModal() {
    setPumpTime(getBeijingNowString())
    setShowPumpModal(true)
  }

  async function handleAddStorage() {
    setSaving(true)
    try {
      await milkApi.addStorage({
        amount_ml: parseFloat(amount),
        storage_type: storageType,
        collected_at: collectedAt,
        note,
      })
      setShowStorageModal(false)
      setAmount(''); setNote('')
      await load()
    } catch (e) { alert('保存失败：' + e.message) }
    finally { setSaving(false) }
  }

  async function handleUseStock(id) {
    try {
      await milkApi.useStorage(id)
      await load()
    } catch (e) { alert('操作失败：' + e.message) }
  }

  async function handleDeleteStock(id) {
    try {
      await milkApi.removeStorage(id)
      await load()
    } catch (e) { alert('删除失败：' + e.message) }
  }

  async function handleAddPump() {
    setSaving(true)
    try {
      await milkApi.addPump({
        amount_ml: parseFloat(pumpAmount),
        side: pumpSide,
        duration_mins: parseInt(pumpDuration) || null,
        pump_time: pumpTime,
        note: '',
      })
      setShowPumpModal(false)
      setPumpAmount(''); setPumpDuration('')
      await load()
    } catch (e) { alert('保存失败：' + e.message) }
    finally { setSaving(false) }
  }

  function renderStockGroup(type) {
    const group = stocks.filter(s => s.storage_type === type)
    if (group.length === 0) return null
    const rule = STORAGE_RULES[type]
    const total = group.reduce((a, s) => a + s.amount_ml, 0)
    return (
      <div key={type} style={{ marginBottom: 16 }}>
        <div className="section-title">
          {rule.icon} {rule.label}存储
          <span style={{ marginLeft: 8, fontSize: 11, color: rule.color, fontWeight: 600 }}>共 {total}ml</span>
        </div>
        {group.map(stock => {
          const status = getExpiryStatus(stock.expiry_at)
          return (
            <div className="milk-card" key={stock.id} style={{ marginBottom: 8 }}>
              <div className="milk-icon">🥛</div>
              <div className="milk-info">
                <div className="milk-amount">{stock.amount_ml} ml</div>
                <div className="milk-meta">
                  挤出：{formatFullTime(stock.collected_at)}
                  {stock.note && ` · ${stock.note}`}
                </div>
                <div className="milk-expiry">
                  <span className={`badge ${status.badgeClass}`}>{status.label}</span>
                  <span style={{ marginLeft: 6, fontSize: 11, color: '#aaa' }}>到期：{formatFullTime(stock.expiry_at)}</span>
                </div>
              </div>
              <div className="milk-actions">
                <button className="icon-btn use" onClick={() => handleUseStock(stock.id)} title="已使用">✓</button>
                <button className="icon-btn delete" onClick={() => handleDeleteStock(stock.id)} title="丢弃">🗑</button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#4a9eff' }}>{stats.fridge_total_ml}</div>
          <div className="stat-label">🧊 冷藏</div>
          <div className="stat-unit">ml</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#9b59b6' }}>{stats.freezer_total_ml}</div>
          <div className="stat-label">❄️ 冷冻</div>
          <div className="stat-unit">ml</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.fridge_total_ml + stats.freezer_total_ml + stats.room_total_ml}</div>
          <div className="stat-label">总库存</div>
          <div className="stat-unit">ml</div>
        </div>
      </div>

      {stats.expiring_soon_count > 0 && (
        <div style={{ background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 12, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#e65100' }}>
          ⚠️ 有 <strong>{stats.expiring_soon_count}</strong> 份母乳 <strong>今日到期 (24点前)</strong>，请及时使用
        </div>
      )}
      {stats.expired_count > 0 && (
        <div style={{ background: '#ffe5e5', border: '1px solid #ef9a9a', borderRadius: 12, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#c62828' }}>
          🚨 有 <strong>{stats.expired_count}</strong> 份母乳已过期，请尽快处理
        </div>
      )}

      <div className="quick-btn-grid">
        <button className="quick-btn" onClick={openStorageModal}>
          <span className="btn-icon">➕</span>
          <span className="btn-label">添加存储</span>
        </button>
        <button className="quick-btn green" onClick={openPumpModal}>
          <span className="btn-icon">🍼</span>
          <span className="btn-label">记录泵奶</span>
        </button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">📋 存储时限参考</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(STORAGE_RULES).map(([key, rule]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: rule.bg, borderRadius: 8 }}>
              <span style={{ fontSize: 18 }}>{rule.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: rule.color }}>{rule.label}</span>
              <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>
                {key === 'room' ? '约4小时' : key === 'fridge' ? '4天' : '6个月'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">📦 当前库存</div>
      {loading ? (
        <div className="empty-state"><div className="empty-icon">⏳</div><p>加载中...</p></div>
      ) : stocks.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🥛</div><p>还没有存储记录</p></div>
      ) : (
        <>
          {renderStockGroup('room')}
          {renderStockGroup('fridge')}
          {renderStockGroup('freezer')}
        </>
      )}

      <div className="section-title">🍼 泵奶记录</div>
      <div className="log-list">
        {pumpLogs.map(log => (
          <div className="log-item" key={log.id}>
            <div className="log-icon">🍼</div>
            <div className="log-info">
              <div className="log-main">{log.amount_ml}ml · {log.side}</div>
              <div className="log-sub">
                <span className="badge badge-pink">泵奶</span>
                {log.duration_mins && <span style={{ marginLeft: 6, fontSize: 12, color: '#aaa' }}>{log.duration_mins}分钟</span>}
              </div>
            </div>
            <div className="log-time">
              <div>{formatClock(log.pump_time)}</div>
              <button onClick={async () => { await milkApi.removePump(log.id); load() }}
                style={{ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ccc' }}>🗑</button>
            </div>
          </div>
        ))}
        {pumpLogs.length === 0 && !loading && (
          <div className="empty-state"><div className="empty-icon">🍼</div><p>还没有泵奶记录</p></div>
        )}
      </div>

      {/* 添加存储弹窗 */}
      {showStorageModal && (
        <div className="modal-overlay" onClick={() => setShowStorageModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🥛 添加母乳存储</div>
              <button className="modal-close" onClick={() => setShowStorageModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">存储方式</label>
              <div className="toggle-group">
                {Object.entries(STORAGE_RULES).map(([key, rule]) => (
                  <button key={key} className={`toggle-btn ${storageType === key ? 'active' : ''}`} onClick={() => setStorageType(key)}>
                    {rule.icon} {rule.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">容量（ml）</label>
              <input type="number" className="form-input" placeholder="例如：120" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">挤奶/存入时间（北京时间）</label>
              <input type="datetime-local" className="form-input" value={collectedAt} onChange={e => setCollectedAt(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">备注（可选）</label>
              <input type="text" className="form-input" placeholder="例如：早上挤的" value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div style={{ background: STORAGE_RULES[storageType].bg, padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: STORAGE_RULES[storageType].color }}>
                {STORAGE_RULES[storageType].icon} 系统将按北京时间自动计算有效期
              </span>
            </div>
            <div className="btn-row">
              <button className="btn-outline" onClick={() => setShowStorageModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleAddStorage} disabled={saving}>{saving ? '保存中...' : '✓ 保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 泵奶弹窗 */}
      {showPumpModal && (
        <div className="modal-overlay" onClick={() => setShowPumpModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🍼 泵奶记录</div>
              <button className="modal-close" onClick={() => setShowPumpModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">泵奶侧</label>
              <div className="side-option-group">
                {['左侧', '右侧', '双侧'].map(s => (
                  <button key={s} className={`side-option ${pumpSide === s ? 'selected' : ''}`} onClick={() => setPumpSide(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">时间（北京时间）</label>
              <input type="datetime-local" className="form-input" value={pumpTime} onChange={e => setPumpTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">泵奶量（ml）</label>
              <input type="number" className="form-input" placeholder="例如：120" value={pumpAmount} onChange={e => setPumpAmount(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">时长（分钟）</label>
              <input type="number" className="form-input" placeholder="例如：20" value={pumpDuration} onChange={e => setPumpDuration(e.target.value)} />
            </div>
            <div className="btn-row">
              <button className="btn-outline" onClick={() => setShowPumpModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleAddPump} disabled={saving}>{saving ? '保存中...' : '✓ 保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
