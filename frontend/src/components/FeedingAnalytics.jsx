import { useState, useMemo } from 'react'
import { generateFeedingMockData, HOURLY_FEEDING_DISTRIBUTION, getFeedingInsights } from '../mockData/feedingAnalyticsMock'

export default function FeedingAnalytics() {
  const [periodDays, setPeriodDays] = useState(14)
  const [chartMetric, setChartMetric] = useState('count') // 'count' | 'bottle'
  const [selectedDayIndex, setSelectedDayIndex] = useState(null)

  // 根据选定天数生成模拟数据
  const daysData = useMemo(() => generateFeedingMockData(periodDays), [periodDays])
  const insights = useMemo(() => getFeedingInsights(daysData), [daysData])

  const maxDailyCount = useMemo(() => Math.max(...daysData.map(d => d.totalFeeds), 10), [daysData])
  const maxDailyBottle = useMemo(() => Math.max(...daysData.map(d => d.bottleAmount), 500), [daysData])
  const maxHourlyCount = useMemo(() => Math.max(...HOURLY_FEEDING_DISTRIBUTION.map(d => d.count)), [])

  // 默认选中最后一天（今天）
  const activeDay = selectedDayIndex !== null ? daysData[selectedDayIndex] : daysData[daysData.length - 1]

  return (
    <div className="analytics-page">
      {/* 周期筛选 */}
      <div className="period-tabs">
        <button
          className={`period-btn ${periodDays === 7 ? 'active' : ''}`}
          onClick={() => { setPeriodDays(7); setSelectedDayIndex(null) }}
        >
          近 7 天 (1周)
        </button>
        <button
          className={`period-btn ${periodDays === 14 ? 'active' : ''}`}
          onClick={() => { setPeriodDays(14); setSelectedDayIndex(null) }}
        >
          近 14 天 (2周)
        </button>
        <button
          className={`period-btn ${periodDays === 30 ? 'active' : ''}`}
          onClick={() => { setPeriodDays(30); setSelectedDayIndex(null) }}
        >
          近 30 天 (1月)
        </button>
      </div>

      {/* 核心指标四宫格 */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">🍼</div>
          <div className="kpi-value">{insights.avgDailyFeeds} <span className="kpi-unit">次/天</span></div>
          <div className="kpi-title">日均喂奶频次</div>
          <div className="kpi-sub">单次吃奶更饱满稳定</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">⏱</div>
          <div className="kpi-value">{insights.avgInterval} <span className="kpi-unit">小时</span></div>
          <div className="kpi-title">平均进食间隔</div>
          <div className="kpi-sub">最长夜间拉长至 {insights.maxNightInterval}h</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">🌙</div>
          <div className="kpi-value">{insights.avgNightFeeds} <span className="kpi-unit">次/夜</span></div>
          <div className="kpi-title">平均夜奶次数</div>
          <div className="kpi-sub">22:00 - 06:00 期间</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">🥛</div>
          <div className="kpi-value">{insights.avgBottle} <span className="kpi-unit">ml/天</span></div>
          <div className="kpi-title">奶瓶摄入量</div>
          <div className="kpi-sub">+ 亲喂均 {insights.avgBreastMins} 分钟</div>
        </div>
      </div>

      {/* 综合健康与规律度评分 */}
      <div className="card score-card">
        <div className="score-left">
          <div className="score-circle">
            <span className="score-num">{insights.regularityScore}</span>
            <span className="score-label">规律指数</span>
          </div>
        </div>
        <div className="score-right">
          <div className="score-title">宝宝近期喂养规律良好 🌟</div>
          <div className="score-desc">
            喂养间隔逐步规律在 3 小时左右，夜奶频次呈平稳递减趋势，生长能量摄入充足。
          </div>
        </div>
      </div>

      {/* 每日趋势对比图 */}
      <div className="card">
        <div className="chart-header">
          <div className="card-title" style={{ margin: 0 }}>📈 每日喂养趋势</div>
          <div className="metric-toggle">
            <button
              className={`metric-btn ${chartMetric === 'count' ? 'active' : ''}`}
              onClick={() => setChartMetric('count')}
            >
              频次(次)
            </button>
            <button
              className={`metric-btn ${chartMetric === 'bottle' ? 'active' : ''}`}
              onClick={() => setChartMetric('bottle')}
            >
              奶量(ml)
            </button>
          </div>
        </div>

        <div className="chart-legend">
          {chartMetric === 'count' ? (
            <>
              <span className="legend-item"><span className="legend-dot dot-day"></span> 白天喂养</span>
              <span className="legend-item"><span className="legend-dot dot-night"></span> 夜奶</span>
            </>
          ) : (
            <>
              <span className="legend-item"><span className="legend-dot dot-bottle"></span> 奶瓶总量(ml)</span>
              <span className="legend-item"><span className="legend-dot dot-breast"></span> 亲喂时长(分)</span>
            </>
          )}
        </div>

        {/* 柱形走势图 */}
        <div className="analytics-bars-container">
          {daysData.map((day, idx) => {
            const isSelected = selectedDayIndex === idx || (selectedDayIndex === null && idx === daysData.length - 1)
            const heightPercent = chartMetric === 'count'
              ? (day.totalFeeds / maxDailyCount) * 100
              : (day.bottleAmount / maxDailyBottle) * 100

            const dayPercent = (day.dayFeeds / day.totalFeeds) * 100
            const nightPercent = 100 - dayPercent

            return (
              <div
                key={day.fullDate}
                className={`analytics-bar-col ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDayIndex(idx)}
              >
                <div className="analytics-bar-wrapper">
                  {chartMetric === 'count' ? (
                    <div className="analytics-bar stacked" style={{ height: `${heightPercent}%` }}>
                      <div className="bar-part-night" style={{ height: `${nightPercent}%` }}></div>
                      <div className="bar-part-day" style={{ height: `${dayPercent}%` }}></div>
                    </div>
                  ) : (
                    <div
                      className="analytics-bar single"
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                  )}
                </div>
                <div className="analytics-bar-date">{day.date}</div>
              </div>
            )
          })}
        </div>

        {/* 选定某天的明细悬浮卡片 */}
        {activeDay && (
          <div className="active-day-detail">
            <div className="active-day-header">
              <span className="active-day-title">{activeDay.fullDate} ({activeDay.dayName})</span>
              <span className="badge badge-pink">总喂养 {activeDay.totalFeeds} 次</span>
            </div>
            <div className="active-day-metrics">
              <div>☀️ 白天：<strong>{activeDay.dayFeeds} 次</strong></div>
              <div>🌙 夜奶：<strong>{activeDay.nightFeeds} 次</strong></div>
              <div>🍼 奶瓶：<strong>{activeDay.bottleAmount} ml</strong></div>
              <div>🤱 亲喂：<strong>{activeDay.breastDuration} 分钟</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* 昼夜结构与侧别平衡 */}
      <div className="two-col-grid">
        {/* 昼夜喂养比例 */}
        <div className="card">
          <div className="card-title">☀️ 昼夜喂养分布</div>
          <div className="progress-split-wrap">
            <div className="progress-split-bar">
              <div className="split-day" style={{ width: '79%' }}>79%</div>
              <div className="split-night" style={{ width: '21%' }}>21%</div>
            </div>
            <div className="split-labels">
              <span style={{ color: '#4a9eff' }}>☀️ 白天 79% (均5.8次)</span>
              <span style={{ color: '#9b59b6' }}>🌙 夜间 21% (均1.5次)</span>
            </div>
          </div>
          <div className="sub-tip-text">
            夜奶占比适度，宝宝正在建立清晰的昼夜节律。
          </div>
        </div>

        {/* 亲喂左右侧平衡 */}
        <div className="card">
          <div className="card-title">🤱 母乳左右侧平衡</div>
          <div className="progress-split-wrap">
            <div className="progress-split-bar">
              <div className="split-left" style={{ width: `${insights.leftPct}%` }}>{insights.leftPct}%</div>
              <div className="split-right" style={{ width: `${insights.rightPct}%` }}>{insights.rightPct}%</div>
            </div>
            <div className="split-labels">
              <span style={{ color: '#e8789e' }}>左侧 {insights.leftPct}%</span>
              <span style={{ color: '#f39c12' }}>右侧 {insights.rightPct}%</span>
            </div>
          </div>
          <div className="sub-tip-text">
            左右侧进食时长基本均衡（偏差 &lt; 5%），有效促进对称泌乳。
          </div>
        </div>
      </div>

      {/* 24小时喂养时段生物钟分布 */}
      <div className="card">
        <div className="card-title">⏰ 24小时喂养时段分布 (生物钟)</div>
        <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 12 }}>
          观察宝宝全天进食频率热力高峰，了解作息生理节律
        </p>

        <div className="hourly-chart">
          {HOURLY_FEEDING_DISTRIBUTION.map((item) => {
            const hPct = (item.count / maxHourlyCount) * 100
            return (
              <div key={item.hour} className="hourly-col">
                <div className="hourly-bar-wrap">
                  <div
                    className={`hourly-bar ${item.isNight ? 'night' : 'day'} ${item.highlight ? 'highlight' : ''}`}
                    style={{ height: `${hPct}%` }}
                  >
                    <span className="hourly-count">{item.count}</span>
                  </div>
                </div>
                <div className="hourly-time">{item.hour}</div>
              </div>
            )
          })}
        </div>

        <div className="tip-text" style={{ marginTop: 10 }}>
          💡 <strong>密集喂哺期 (Cluster Feeding)</strong>：傍晚 <strong>18:00 - 20:00</strong> 吃奶频次最高，属于婴儿傍晚储能以准备夜间睡眠的自然生理现象。
        </div>
      </div>

      {/* 专家 / 智能育儿建议报告 */}
      <div className="card insights-card">
        <div className="card-title">📋 喂养分析与护理建议</div>

        <div className="insight-item">
          <div className="insight-icon">🌙</div>
          <div className="insight-content">
            <div className="insight-item-title">夜间睡眠拉长信号</div>
            <div className="insight-item-desc">
              近两周最长进食间隔稳定达到 <strong>{insights.maxNightInterval} 小时</strong>。宝宝夜间深睡眠正在发展，若无特殊医疗需求，夜间无需刻意唤醒喂养。
            </div>
          </div>
        </div>

        <div className="insight-item">
          <div className="insight-icon">⚖️</div>
          <div className="insight-content">
            <div className="insight-item-title">双侧亲喂保持均衡</div>
            <div className="insight-item-desc">
              左右亲喂比例为 <strong>{insights.leftPct}% vs {insights.rightPct}%</strong>。每次喂哺建议交替先喂一侧，继续保持当前喂养节奏。
            </div>
          </div>
        </div>

        <div className="insight-item">
          <div className="insight-icon">🍼</div>
          <div className="insight-content">
            <div className="insight-item-title">摄入总量稳步达标</div>
            <div className="insight-item-desc">
              日均综合奶量在 <strong>650ml ~ 750ml</strong> 之间波动，配合每日换尿布频次（&gt;6次），表明宝宝水分与热量供给十分充沛。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
