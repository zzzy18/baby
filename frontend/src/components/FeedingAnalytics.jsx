import { useState, useMemo } from 'react'
import {
  SCENARIO_TYPES,
  generateFeedingMockData,
  getHourlyDistribution,
  evaluateFeedingScenario,
} from '../mockData/feedingAnalyticsMock'

export default function FeedingAnalytics() {
  const [selectedScenario, setSelectedScenario] = useState('steady')
  const [periodDays, setPeriodDays] = useState(14)
  const [chartMetric, setChartMetric] = useState('count') // 'count' | 'bottle'
  const [selectedDayIndex, setSelectedDayIndex] = useState(null)

  // 根据选定场景和天数动态生成历史数据与智能推导报告
  const daysData = useMemo(
    () => generateFeedingMockData(periodDays, selectedScenario),
    [periodDays, selectedScenario]
  )

  const hourlyData = useMemo(
    () => getHourlyDistribution(selectedScenario),
    [selectedScenario]
  )

  const analysis = useMemo(
    () => evaluateFeedingScenario(daysData, selectedScenario),
    [daysData, selectedScenario]
  )

  const maxDailyCount = useMemo(() => Math.max(...daysData.map(d => d.totalFeeds), 10), [daysData])
  const maxDailyBottle = useMemo(() => Math.max(...daysData.map(d => d.bottleAmount), 500), [daysData])
  const maxHourlyCount = useMemo(() => Math.max(...hourlyData.map(d => d.count)), [hourlyData])

  // 默认选中最后一天（今天）
  const activeDay = selectedDayIndex !== null ? daysData[selectedDayIndex] : daysData[daysData.length - 1]

  return (
    <div className="analytics-page">
      {/* 场景模拟切换器 */}
      <div className="card scenario-selector-card">
        <div className="scenario-header">
          <span className="scenario-label">🎯 喂养场景模拟演示：</span>
          <span className="scenario-hint">点击体验不同喂养状态下的动态建议</span>
        </div>
        <div className="scenario-pills">
          {SCENARIO_TYPES.map(sc => (
            <button
              key={sc.id}
              className={`scenario-pill ${selectedScenario === sc.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedScenario(sc.id)
                setSelectedDayIndex(null)
              }}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

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
          <div className="kpi-value">{analysis.avgDailyFeeds} <span className="kpi-unit">次/天</span></div>
          <div className="kpi-title">日均喂奶频次</div>
          <div className="kpi-sub">
            {selectedScenario === 'cluster_feeding' ? '密集挂喂激增' : selectedScenario === 'frequent_night' ? '夜间频次过高' : '单次吃奶更稳定'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">⏱</div>
          <div className="kpi-value">{analysis.avgInterval} <span className="kpi-unit">小时</span></div>
          <div className="kpi-title">平均进食间隔</div>
          <div className="kpi-sub">最长夜间拉长至 {analysis.maxNightInterval}h</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">🌙</div>
          <div className="kpi-value">{analysis.avgNightFeeds} <span className="kpi-unit">次/夜</span></div>
          <div className="kpi-title">平均夜奶次数</div>
          <div className="kpi-sub">22:00 - 06:00 期间</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">🥛</div>
          <div className="kpi-value">{analysis.avgBottle} <span className="kpi-unit">ml/天</span></div>
          <div className="kpi-title">奶瓶摄入量</div>
          <div className="kpi-sub">+ 亲喂均 {analysis.avgBreastMins} 分钟</div>
        </div>
      </div>

      {/* 综合健康与规律度评分（动态计算） */}
      <div className="card score-card">
        <div className="score-left">
          <div
            className="score-circle"
            style={{
              background:
                analysis.regularityScore >= 85
                  ? 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)'
                  : analysis.regularityScore >= 70
                  ? 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
                  : 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            }}
          >
            <span className="score-num">{analysis.regularityScore}</span>
            <span className="score-label">规律指数</span>
          </div>
        </div>
        <div className="score-right">
          <div className="score-title">{analysis.diagnosisTitle}</div>
          <div className="score-desc">{analysis.diagnosisDesc}</div>
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
              <div
                className="split-day"
                style={{
                  width: selectedScenario === 'frequent_night' ? '60%' : '79%',
                }}
              >
                {selectedScenario === 'frequent_night' ? '60%' : '79%'}
              </div>
              <div
                className="split-night"
                style={{
                  width: selectedScenario === 'frequent_night' ? '40%' : '21%',
                }}
              >
                {selectedScenario === 'frequent_night' ? '40%' : '21%'}
              </div>
            </div>
            <div className="split-labels">
              <span style={{ color: '#4a9eff' }}>☀️ 白天 ({selectedScenario === 'frequent_night' ? '60%' : '79%'})</span>
              <span style={{ color: '#9b59b6' }}>🌙 夜间 ({selectedScenario === 'frequent_night' ? '40%' : '21%'})</span>
            </div>
          </div>
          <div className="sub-tip-text">
            {selectedScenario === 'frequent_night'
              ? '⚠️ 夜间吃奶频次过高，昼夜节律有颠倒倾向。'
              : '夜奶占比处于健康递减区间，昼夜节律发展良好。'}
          </div>
        </div>

        {/* 亲喂左右侧平衡 */}
        <div className="card">
          <div className="card-title">🤱 母乳左右侧平衡</div>
          <div className="progress-split-wrap">
            <div className="progress-split-bar">
              <div className="split-left" style={{ width: `${analysis.leftPct}%` }}>{analysis.leftPct}%</div>
              <div className="split-right" style={{ width: `${analysis.rightPct}%` }}>{analysis.rightPct}%</div>
            </div>
            <div className="split-labels">
              <span style={{ color: '#e8789e' }}>左侧 {analysis.leftPct}%</span>
              <span style={{ color: '#f39c12' }}>右侧 {analysis.rightPct}%</span>
            </div>
          </div>
          <div className="sub-tip-text">
            {Math.abs(analysis.leftPct - analysis.rightPct) > 20
              ? '⚠️ 偏侧较为严重（相差>20%），需注意预防单侧堵奶与大小胸。'
              : '左右侧进食时长基本均衡，有效促进对称泌乳。'}
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
          {hourlyData.map((item) => {
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
          {selectedScenario === 'cluster_feeding' ? (
            <>⚡️ <strong>密集挂喂峰值</strong>：傍晚 <strong>18:00 - 20:00</strong> 吃奶频次激增至高峰，系典型的新生儿傍晚储能生理行为。</>
          ) : selectedScenario === 'frequent_night' ? (
            <>🌙 <strong>夜间时段警示</strong>：午夜至凌晨 <strong>00:00 - 04:00</strong> 进食高峰未落，说明夜间觉醒过密。</>
          ) : (
            <>💡 <strong>作息规律平稳</strong>：白天餐次均匀分布，傍晚 <strong>18:00 - 20:00</strong> 微峰储能准备入睡。</>
          )}
        </div>
      </div>

      {/* 动态场景专属喂养建议报告 */}
      <div className="card insights-card">
        <div className="card-title">📋 针对当前喂养场景的智能护理建议</div>

        {analysis.recommendations.map((rec, rIdx) => (
          <div className="insight-item" key={rIdx}>
            <div className="insight-icon">{rec.icon}</div>
            <div className="insight-content">
              <div className="insight-item-title">{rec.title}</div>
              <div className="insight-item-desc">{rec.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
