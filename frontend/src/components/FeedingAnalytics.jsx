import { useState, useMemo } from 'react'
import {
  SCENARIO_TYPES,
  generateFeedingMockData,
  getHourlyDistribution,
} from '../mockData/feedingAnalyticsMock'
import {
  extractClinicalFeatures,
  calculateMultidimensionalScores,
  evaluateDeepClinicalRules,
} from '../mockData/feedingRulesEngine'

export default function FeedingAnalytics({ babyProfile, babyAge }) {
  const profile = babyProfile || { name: '悠悠', weightKg: 4.6, birthday: '2026-08-24' }
  const age = babyAge || { ageText: '生后 45 天', totalDays: 45 }

  const [selectedScenario, setSelectedScenario] = useState('steady')
  const [periodDays, setPeriodDays] = useState(14)
  const [chartMetric, setChartMetric] = useState('count') // 'count' | 'bottle'
  const [selectedDayIndex, setSelectedDayIndex] = useState(null)
  const [activeDomainFilter, setActiveDomainFilter] = useState('all')

  // 1. 生成选定场景的历史数据
  const daysData = useMemo(
    () => generateFeedingMockData(periodDays, selectedScenario),
    [periodDays, selectedScenario]
  )

  // 2. 抽取多维临床特征（深度融入宝宝体重与月龄）
  const features = useMemo(
    () => extractClinicalFeatures(daysData, selectedScenario, profile.weightKg, age.totalDays),
    [daysData, selectedScenario, profile.weightKg, age.totalDays]
  )

  // 3. 计算 5 维加权健康评分
  const scores = useMemo(
    () => calculateMultidimensionalScores(features),
    [features]
  )

  // 4. 执行深度儿科临床规则推理
  const evaluations = useMemo(
    () => evaluateDeepClinicalRules(features),
    [features]
  )

  // 5. 24小时时段分布
  const hourlyData = useMemo(
    () => getHourlyDistribution(selectedScenario),
    [selectedScenario]
  )

  const maxDailyCount = useMemo(() => Math.max(...daysData.map(d => d.totalFeeds), 10), [daysData])
  const maxDailyBottle = useMemo(() => Math.max(...daysData.map(d => d.bottleAmount), 500), [daysData])
  const maxHourlyCount = useMemo(() => Math.max(...hourlyData.map(d => d.count)), [hourlyData])

  // 默认选中最后一天（今天）
  const activeDay = selectedDayIndex !== null ? daysData[selectedDayIndex] : daysData[daysData.length - 1]

  // 过滤展示的建议
  const filteredEvaluations = useMemo(() => {
    if (activeDomainFilter === 'all') return evaluations
    return evaluations.filter(e => e.domain === activeDomainFilter)
  }, [evaluations, activeDomainFilter])

  // 所有涉及的领域清单
  const domains = useMemo(() => {
    const set = new Set(evaluations.map(e => e.domain))
    return ['all', ...Array.from(set)]
  }, [evaluations])

  return (
    <div className="analytics-page">
      {/* 场景模拟切换器 */}
      <div className="card scenario-selector-card">
        <div className="scenario-header">
          <span className="scenario-label">🎯 深度喂养场景切换器：</span>
          <span className="scenario-hint">切换观察临床规则与诊断联动</span>
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

      {/* 宝宝月龄体重基准横幅 */}
      <div className="analytics-profile-context">
        <div className="context-item">👶 <strong>{profile.name}</strong> · {age.ageText}</div>
        <div className="context-item">⚖️ 体重 <strong>{profile.weightKg} kg</strong></div>
        <div className="context-item">🥛 目标摄入：<strong>{Math.round(profile.weightKg * 120)} ~ {Math.round(profile.weightKg * 150)} ml/天</strong></div>
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

      {/* 综合健康体检与 5 维细分模型 */}
      <div className="card score-matrix-card">
        <div className="matrix-top">
          <div
            className="matrix-circle"
            style={{
              background:
                scores.totalScore >= 85
                  ? 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)'
                  : scores.totalScore >= 70
                  ? 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
                  : 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            }}
          >
            <span className="matrix-num">{scores.totalScore}</span>
            <span className="matrix-label">综合喂养分</span>
          </div>

          <div className="matrix-summary">
            <div className="matrix-status-title">
              {scores.totalScore >= 85
                ? '🌟 喂养节律健康优异'
                : scores.totalScore >= 70
                ? '⚠️ 存在部分指标失衡'
                : '🚨 需及时调整喂养策略'}
            </div>
            <div className="matrix-status-sub">
              结合儿科临床与国际泌乳顾问（IBCLC）5维交叉验证模型实时评估
            </div>
          </div>
        </div>

        {/* 5 维小柱进度条 */}
        <div className="dimensions-grid">
          <div className="dimension-item">
            <div className="dim-header">
              <span>昼夜成熟度</span>
              <strong>{scores.circadianScore}分</strong>
            </div>
            <div className="dim-bar">
              <div className="dim-fill" style={{ width: `${scores.circadianScore}%`, background: '#4a9eff' }}></div>
            </div>
          </div>

          <div className="dimension-item">
            <div className="dim-header">
              <span>双侧对称性</span>
              <strong>{scores.symmetryScore}分</strong>
            </div>
            <div className="dim-bar">
              <div className="dim-fill" style={{ width: `${scores.symmetryScore}%`, background: '#f8a4c8' }}></div>
            </div>
          </div>

          <div className="dimension-item">
            <div className="dim-header">
              <span>进食规律度</span>
              <strong>{scores.regularityScore}分</strong>
            </div>
            <div className="dim-bar">
              <div className="dim-fill" style={{ width: `${scores.regularityScore}%`, background: '#2ecc71' }}></div>
            </div>
          </div>

          <div className="dimension-item">
            <div className="dim-header">
              <span>消化与吸收</span>
              <strong>{scores.digestiveScore}分</strong>
            </div>
            <div className="dim-bar">
              <div className="dim-fill" style={{ width: `${scores.digestiveScore}%`, background: '#f39c12' }}></div>
            </div>
          </div>

          <div className="dimension-item" style={{ gridColumn: 'span 2' }}>
            <div className="dim-header">
              <span>摄入充沛度</span>
              <strong>{scores.adequacyScore}分</strong>
            </div>
            <div className="dim-bar">
              <div className="dim-fill" style={{ width: `${scores.adequacyScore}%`, background: '#9b59b6' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 核心指标四宫格 */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">🍼</div>
          <div className="kpi-value">{features.avgDailyFeeds} <span className="kpi-unit">次/天</span></div>
          <div className="kpi-title">日均喂奶频次</div>
          <div className="kpi-sub">
            {selectedScenario === 'cluster_feeding' ? '傍晚储能密集' : selectedScenario === 'frequent_night' ? '夜间频次过高' : '单次吃奶更饱满'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">⏱</div>
          <div className="kpi-value">{features.avgInterval} <span className="kpi-unit">小时</span></div>
          <div className="kpi-title">平均进食间隔</div>
          <div className="kpi-sub">最长单次拉长至 {features.longestStretchHours}h</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">🌙</div>
          <div className="kpi-value">{features.nightFeedCount} <span className="kpi-unit">次/夜</span></div>
          <div className="kpi-title">平均夜奶次数</div>
          <div className="kpi-sub">占全天 {Math.round(features.nightRatio * 100)}% 摄入</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">🥛</div>
          <div className="kpi-value">{features.avgBottle} <span className="kpi-unit">ml/天</span></div>
          <div className="kpi-title">奶瓶摄入量</div>
          <div className="kpi-sub">
            基准 {Math.round(profile.weightKg * 150)}ml (达成{Math.round((features.avgBottle / Math.max(1, profile.weightKg * 150)) * 100)}%)
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
              <div
                className="split-day"
                style={{
                  width: `${100 - Math.round(features.nightRatio * 100)}%`,
                }}
              >
                {100 - Math.round(features.nightRatio * 100)}%
              </div>
              <div
                className="split-night"
                style={{
                  width: `${Math.round(features.nightRatio * 100)}%`,
                }}
              >
                {Math.round(features.nightRatio * 100)}%
              </div>
            </div>
            <div className="split-labels">
              <span style={{ color: '#4a9eff' }}>☀️ 白天 ({100 - Math.round(features.nightRatio * 100)}%)</span>
              <span style={{ color: '#9b59b6' }}>🌙 夜间 ({Math.round(features.nightRatio * 100)}%)</span>
            </div>
          </div>
          <div className="sub-tip-text">
            {features.nightRatio > 0.35
              ? '⚠️ 夜奶摄入占比超过 35%，夜间节律未完全收敛。'
              : '夜奶占比处于健康递减区间，昼夜节律发展良好。'}
          </div>
        </div>

        {/* 亲喂左右侧平衡 */}
        <div className="card">
          <div className="card-title">🤱 母乳左右侧平衡</div>
          <div className="progress-split-wrap">
            <div className="progress-split-bar">
              <div className="split-left" style={{ width: `${features.leftPct}%` }}>{features.leftPct}%</div>
              <div className="split-right" style={{ width: `${features.rightPct}%` }}>{features.rightPct}%</div>
            </div>
            <div className="split-labels">
              <span style={{ color: '#e8789e' }}>左侧 {features.leftPct}%</span>
              <span style={{ color: '#f39c12' }}>右侧 {features.rightPct}%</span>
            </div>
          </div>
          <div className="sub-tip-text">
            {Math.abs(features.leftPct - features.rightPct) >= 20
              ? '⚠️ 偏侧失衡明显（差距≥20%），需注意预防单侧乳房大小差异与堵奶。'
              : '左右侧进食时长基本均衡，有效促进对称泌乳。'}
          </div>
        </div>
      </div>

      {/* 24小时喂养时段生物钟分布 */}
      <div className="card">
        <div className="card-title">⏰ 24小时喂养时段分布 (生物钟)</div>
        <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 12 }}>
          观察宝宝全天进食频率热力高峰，识别生理储能峰
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
      </div>

      {/* 深度儿科临床诊断与行动指南 */}
      <div className="clinical-reports-section">
        <div className="reports-section-header">
          <div className="section-main-title">🩺 儿科与泌乳专家深度评估报告</div>
          <div className="domain-filters">
            {domains.map(dom => (
              <button
                key={dom}
                className={`domain-filter-btn ${activeDomainFilter === dom ? 'active' : ''}`}
                onClick={() => setActiveDomainFilter(dom)}
              >
                {dom === 'all' ? '全部领域' : dom}
              </button>
            ))}
          </div>
        </div>

        <div className="clinical-card-list">
          {filteredEvaluations.map(ev => {
            const levelClass =
              ev.level === 'green' ? 'badge-green'
              : ev.level === 'yellow' ? 'badge-orange'
              : ev.level === 'orange' ? 'badge-orange'
              : 'badge-red'

            return (
              <div key={ev.id} className={`clinical-card border-${ev.level}`}>
                <div className="clinical-card-header">
                  <span className="clinical-domain-tag">{ev.domain}</span>
                  <span className={`badge ${levelClass}`}>{ev.levelText}</span>
                </div>

                <div className="clinical-title">{ev.title}</div>

                {/* 现象诊断 */}
                <div className="clinical-block">
                  <div className="block-label">📊 监测现象与数据诊断：</div>
                  <div className="block-content phenomenon-text">{ev.phenomenon}</div>
                </div>

                {/* 儿科机理解读 */}
                <div className="clinical-block">
                  <div className="block-label">🧬 儿科与泌乳医学机理：</div>
                  <div className="block-content mechanism-text">{ev.medicalMechanism}</div>
                </div>

                {/* 落地行动方案 */}
                <div className="clinical-block">
                  <div className="block-label">📌 3步落地护理行动方案：</div>
                  <ul className="action-step-list">
                    {ev.actionPlan.map((step, sIdx) => (
                      <li key={sIdx} className="action-step-item">
                        <span className="step-num">{sIdx + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 宜忌对比清单 */}
                <div className="dos-donts-grid">
                  <div className="dos-box">
                    <div className="dos-header">✅ 【宜】推荐做法</div>
                    <ul>
                      {ev.dos.map((d, dIdx) => (
                        <li key={dIdx}>{d}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="donts-box">
                    <div className="donts-header">❌ 【忌】避免误区</div>
                    <ul>
                      {ev.donts.map((d, dIdx) => (
                        <li key={dIdx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
