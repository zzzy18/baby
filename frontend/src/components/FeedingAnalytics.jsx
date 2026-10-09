import { useState, useMemo, useEffect, useCallback } from 'react'
import { feedingApi } from '../api'
import { getRecommendedFeedingMetrics } from '../mockData/babyProfile'
import {
  SCENARIO_TYPES,
  generateFeedingMockData,
  getHourlyDistribution,
  aggregateRealFeedingLogs,
  getRealHourlyDistribution,
  matchScenarioSimilarity,
  generateDemoFeedingRecords,
} from '../mockData/feedingAnalyticsMock'
import {
  extractClinicalFeatures,
  calculateMultidimensionalScores,
  evaluateDeepClinicalRules,
} from '../mockData/feedingRulesEngine'

export default function FeedingAnalytics({ babyProfile, babyAge, onGoFeeding }) {
  const profile = babyProfile || { name: '悠悠', weightKg: 4.6, birthday: '2026-08-24' }
  const age = babyAge || { ageText: '生后 45 天', totalDays: 45 }

  // 默认首选真实实测数据
  const [selectedScenario, setSelectedScenario] = useState('real')
  const [periodDays, setPeriodDays] = useState(14)
  const [chartMetric, setChartMetric] = useState('count') // 'count' | 'bottle'
  const [selectedDayIndex, setSelectedDayIndex] = useState(null)
  const [activeDomainFilter, setActiveDomainFilter] = useState('all')

  // 真实打卡数据状态
  const [realLogs, setRealLogs] = useState([])
  const [loadingReal, setLoadingReal] = useState(true)
  const [generatingDemo, setGeneratingDemo] = useState(false)

  // 1. 加载云端数据库中保存的真实喂养打卡记录
  const loadRealLogs = useCallback(async () => {
    setLoadingReal(true)
    try {
      const logs = await feedingApi.list(200)
      setRealLogs(logs || [])
    } catch (e) {
      console.warn('加载真实喂养记录失败，将以本地状态展示:', e)
    } finally {
      setLoadingReal(false)
    }
  }, [])

  useEffect(() => {
    loadRealLogs()
  }, [loadRealLogs])

  // 一键生成近7天标准示范真实打卡记录并写入后端数据库
  async function handleGenerateDemo() {
    if (generatingDemo) return
    setGeneratingDemo(true)
    try {
      const demoRecords = generateDemoFeedingRecords(profile.weightKg)
      for (const rec of demoRecords) {
        await feedingApi.add(rec)
      }
      await loadRealLogs()
      setSelectedScenario('real')
      setSelectedDayIndex(null)
    } catch (e) {
      console.error('示范打卡数据生成失败:', e)
    } finally {
      setGeneratingDemo(false)
    }
  }

  // 2. 儿科权威生理基准参数 (WHO / AAP 标准)
  const pediatricMetrics = useMemo(
    () => getRecommendedFeedingMetrics(profile.weightKg, age.totalDays),
    [profile.weightKg, age.totalDays]
  )

  // 3. 聚合真实打卡数据
  const realAggregated = useMemo(
    () => aggregateRealFeedingLogs(realLogs, periodDays),
    [realLogs, periodDays]
  )

  // 4. 计算真实数据的临床特征
  const realFeatures = useMemo(
    () => extractClinicalFeatures(realAggregated.daysData, 'real', profile.weightKg, age.totalDays),
    [realAggregated.daysData, profile.weightKg, age.totalDays]
  )

  // 5. 真实数据与经典场景吻合度匹配
  const scenarioMatch = useMemo(
    () => matchScenarioSimilarity(realFeatures),
    [realFeatures]
  )

  // 6. 当前展示的数据源（真实数据 vs 选定模拟场景）
  const isRealMode = selectedScenario === 'real'

  const daysData = useMemo(() => {
    if (isRealMode) {
      return realAggregated.daysData
    }
    return generateFeedingMockData(periodDays, selectedScenario)
  }, [isRealMode, realAggregated.daysData, periodDays, selectedScenario])

  const features = useMemo(() => {
    if (isRealMode) {
      return realFeatures
    }
    return extractClinicalFeatures(daysData, selectedScenario, profile.weightKg, age.totalDays)
  }, [isRealMode, realFeatures, daysData, selectedScenario, profile.weightKg, age.totalDays])

  // 7. 计算 5 维加权健康评分
  const scores = useMemo(
    () => calculateMultidimensionalScores(features),
    [features]
  )

  // 8. 执行深度儿科临床规则推理
  const evaluations = useMemo(
    () => evaluateDeepClinicalRules(features),
    [features]
  )

  // 9. 24小时时段分布
  const hourlyData = useMemo(() => {
    if (isRealMode) {
      return getRealHourlyDistribution(realLogs)
    }
    return getHourlyDistribution(selectedScenario)
  }, [isRealMode, realLogs, selectedScenario])

  // 图表刻度与基准线计算
  const chartBenchmarkValue = chartMetric === 'count' ? 7 : pediatricMetrics.standardDaily
  const chartRealValue = chartMetric === 'count' ? realFeatures.avgDailyFeeds : realFeatures.avgBottle

  const maxDailyCount = useMemo(() => {
    const maxVal = Math.max(...daysData.map(d => d.totalFeeds || 0), chartBenchmarkValue, 8)
    return Math.ceil(maxVal * 1.15)
  }, [daysData, chartBenchmarkValue])

  const maxDailyBottle = useMemo(() => {
    const maxVal = Math.max(...daysData.map(d => d.bottleAmount || 0), chartBenchmarkValue, 500)
    return Math.ceil(maxVal * 1.15)
  }, [daysData, chartBenchmarkValue])

  const chartMaxValue = chartMetric === 'count' ? maxDailyCount : maxDailyBottle
  const maxHourlyCount = useMemo(() => Math.max(...hourlyData.map(d => d.count), 1), [hourlyData])

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

  const currentScenarioObj = SCENARIO_TYPES.find(s => s.id === selectedScenario)

  return (
    <div className="analytics-page">
      {/* 场景与数据源选择器 */}
      <div className="card scenario-selector-card">
        <div className="scenario-header">
          <span className="scenario-label">🎯 喂养数据源与临床场景切换：</span>
          <span className="scenario-hint">
            {isRealMode ? '✨ 当前为宝宝真实实测分析' : '🔬 当前为经典场景对照模拟'}
          </span>
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
        <div className="context-item">
          🥛 儿科基准线：<strong>{pediatricMetrics.minDaily} ~ {pediatricMetrics.standardDaily} ml/天</strong>
        </div>
      </div>

      {/* 真实数据为空时的无缝引导卡片 */}
      {isRealMode && !realAggregated.hasRealData && !loadingReal && (
        <div className="card real-data-prompt-card">
          <div className="prompt-header">
            <span className="prompt-badge">💡 真实数据待打卡</span>
            <span className="prompt-title">当前云端尚未记录真实喂奶数据</span>
          </div>
          <p className="prompt-desc">
            下方已为您准备好【儿科标准基准】作为对照坐标系。您可以前往打卡，或一键生成近 7 天示范打卡记录，立即体验真实数据与儿科医学标准的深度对比分析！
          </p>
          <div className="prompt-actions">
            <button
              className="btn-primary"
              onClick={handleGenerateDemo}
              disabled={generatingDemo}
            >
              {generatingDemo ? '正在写入示范数据...' : '✨ 一键生成近7天示范打卡 (体验深度对标)'}
            </button>
            {onGoFeeding && (
              <button className="btn-outline" onClick={onGoFeeding}>
                🍼 前往喂奶页面手动打卡
              </button>
            )}
          </div>
        </div>
      )}

      {/* 如果已有真实数据，显示同步状态 */}
      {realAggregated.hasRealData && (
        <div className="real-sync-status">
          <span>
            📊 已同步 <strong>{realAggregated.realLogsCount}</strong> 条云端打卡记录（近 {periodDays} 天有效打卡 <strong>{realAggregated.validDaysCount}</strong> 天）
          </span>
          {!isRealMode && (
            <button className="btn-link-sm" onClick={() => setSelectedScenario('real')}>
              返回真实实测 →
            </button>
          )}
        </div>
      )}

      {/* 场景对照模式下的对比提示条 */}
      {!isRealMode && (
        <div className="scenario-comparison-banner">
          <div className="banner-left">
            <span className="badge badge-orange">场景对比参照</span>
            <span>
              当前模拟【<strong>{currentScenarioObj?.label}</strong>】：日均奶量 <strong>{features.avgBottle} ml</strong>
              {realFeatures.avgBottle > 0 ? (
                ` (较宝宝实测 ${realFeatures.avgBottle} ml ${features.avgBottle >= realFeatures.avgBottle ? '高出' : '低于'} ${Math.abs(Math.round(((features.avgBottle - realFeatures.avgBottle) / realFeatures.avgBottle) * 100))}%)`
              ) : ''}；
              日均喂养 <strong>{features.avgDailyFeeds} 次</strong>
              {realFeatures.avgDailyFeeds > 0 ? ` (宝宝实测 ${realFeatures.avgDailyFeeds} 次)` : ''}
            </span>
          </div>
          <button className="btn-pill-sm" onClick={() => setSelectedScenario('real')}>
            查看宝宝实测 👈
          </button>
        </div>
      )}

      {/* ===== 核心亮点：真实数据 vs 儿科推荐标准 深度对比看板 ===== */}
      <div className="card comparison-board-card">
        <div className="board-header">
          <div className="board-title">⚖️ 喂养数据 vs 儿科临床基准深度对照</div>
          <div className="board-subtitle">
            以宝宝当前体重 <strong>{profile.weightKg}kg</strong> 与月龄 <strong>{age.ageText}</strong> 作为医学对照坐标系
          </div>
        </div>

        {/* 场景画像吻合度比对 */}
        <div className="scenario-match-badge">
          <div className="match-tag">🎯 临床场景画像比对：</div>
          <div className="match-content">
            根据宝宝当前打卡特征，与临床典型画像【<strong>{scenarioMatch.label}</strong>】吻合度达 <strong>{scenarioMatch.similarity}%</strong>。
            <span className="match-reason">{scenarioMatch.reason}</span>
          </div>
        </div>

        {/* 5 维度对比表格 */}
        <div className="comparison-table">
          <div className="comp-row comp-header-row">
            <div className="comp-col col-metric">评估维度</div>
            <div className="comp-col col-real">
              {isRealMode ? '宝宝实际值 (实测)' : '当前场景值 (模拟)'}
            </div>
            <div className="comp-col col-standard">儿科推荐基准 (对照)</div>
            <div className="comp-col col-status">医学对比诊断</div>
          </div>

          {/* 1. 日均总奶量 */}
          <div className="comp-row">
            <div className="comp-col col-metric">
              <span className="metric-icon">🥛</span>
              <div>
                <strong>每日总奶量</strong>
                <div className="metric-hint">120-150ml/kg</div>
              </div>
            </div>
            <div className="comp-col col-real">
              <strong className="real-val">{features.avgBottle} ml</strong>
              {!isRealMode && realFeatures.avgBottle > 0 && (
                <div className="real-sub">实测 {realFeatures.avgBottle}ml</div>
              )}
            </div>
            <div className="comp-col col-standard">
              {pediatricMetrics.minDaily} ~ {pediatricMetrics.standardDaily} ml
            </div>
            <div className="comp-col col-status">
              {features.avgBottle >= pediatricMetrics.minDaily && features.avgBottle <= pediatricMetrics.maxDaily ? (
                <span className="badge badge-green">
                  🟢 摄入充沛达标 ({Math.round((features.avgBottle / pediatricMetrics.standardDaily) * 100)}%)
                </span>
              ) : features.avgBottle < pediatricMetrics.minDaily ? (
                <span className="badge badge-orange">
                  🟡 偏低 ({Math.round((features.avgBottle / pediatricMetrics.standardDaily) * 100)}%)
                </span>
              ) : (
                <span className="badge badge-red">🔴 偏高 (防过度喂养)</span>
              )}
            </div>
          </div>

          {/* 2. 喂奶频次 */}
          <div className="comp-row">
            <div className="comp-col col-metric">
              <span className="metric-icon">🍼</span>
              <div>
                <strong>日均喂奶频次</strong>
                <div className="metric-hint">胃容量生理匹配</div>
              </div>
            </div>
            <div className="comp-col col-real">
              <strong className="real-val">{features.avgDailyFeeds} 次/天</strong>
              {!isRealMode && realFeatures.avgDailyFeeds > 0 && (
                <div className="real-sub">实测 {realFeatures.avgDailyFeeds}次</div>
              )}
            </div>
            <div className="comp-col col-standard">
              {pediatricMetrics.suggestedFrequency}
            </div>
            <div className="comp-col col-status">
              {features.avgDailyFeeds >= 5 && features.avgDailyFeeds <= 9 ? (
                <span className="badge badge-green">🟢 频次适宜</span>
              ) : features.avgDailyFeeds > 9 ? (
                <span className="badge badge-orange">⚠️ 偏频 (可能零食奶)</span>
              ) : (
                <span className="badge badge-orange">🟡 偏少</span>
              )}
            </div>
          </div>

          {/* 3. 平均进食间隔 */}
          <div className="comp-row">
            <div className="comp-col col-metric">
              <span className="metric-icon">⏱</span>
              <div>
                <strong>平均进食间隔</strong>
                <div className="metric-hint">胃排空稳定节律</div>
              </div>
            </div>
            <div className="comp-col col-real">
              <strong className="real-val">{features.avgInterval} 小时</strong>
              <div className="real-sub">最长 {features.longestStretchHours}h</div>
            </div>
            <div className="comp-col col-standard">
              2.5 ~ 3.5 小时
            </div>
            <div className="comp-col col-status">
              {features.avgInterval >= 2.5 && features.avgInterval <= 3.8 ? (
                <span className="badge badge-green">🟢 规律平稳</span>
              ) : features.avgInterval < 2.5 ? (
                <span className="badge badge-orange">⚠️ 偏紧凑</span>
              ) : (
                <span className="badge badge-green">🟢 间隔拉长</span>
              )}
            </div>
          </div>

          {/* 4. 夜奶次数与占比 */}
          <div className="comp-row">
            <div className="comp-col col-metric">
              <span className="metric-icon">🌙</span>
              <div>
                <strong>夜奶频次与占比</strong>
                <div className="metric-hint">昼夜节律成熟度</div>
              </div>
            </div>
            <div className="comp-col col-real">
              <strong className="real-val">{features.nightFeedCount} 次</strong>
              <div className="real-sub">占全天 {Math.round(features.nightRatio * 100)}%</div>
            </div>
            <div className="comp-col col-standard">
              ≤ 2 次 / ≤ 25%
            </div>
            <div className="comp-col col-status">
              {features.nightFeedCount <= 2.2 && features.nightRatio <= 0.28 ? (
                <span className="badge badge-green">🟢 昼夜节律良好</span>
              ) : (
                <span className="badge badge-orange">⚠️ 夜奶偏频</span>
              )}
            </div>
          </div>

          {/* 5. 亲喂双侧平衡 */}
          <div className="comp-row">
            <div className="comp-col col-metric">
              <span className="metric-icon">🤱</span>
              <div>
                <strong>亲喂双侧平衡</strong>
                <div className="metric-hint">防单侧堵奶与大小胸</div>
              </div>
            </div>
            <div className="comp-col col-real">
              <strong className="real-val">左 {features.leftPct}% : 右 {features.rightPct}%</strong>
              <div className="real-sub">差值 {Math.abs(features.leftPct - features.rightPct)}%</div>
            </div>
            <div className="comp-col col-standard">
              50% : 50% (差值 &lt; 15%)
            </div>
            <div className="comp-col col-status">
              {Math.abs(features.leftPct - features.rightPct) <= 15 ? (
                <span className="badge badge-green">🟢 双侧对称</span>
              ) : (
                <span className="badge badge-orange">⚠️ 偏侧失衡</span>
              )}
            </div>
          </div>
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
            基准 {pediatricMetrics.suggestedFrequency} ({features.avgDailyFeeds >= 5 && features.avgDailyFeeds <= 9 ? '✓ 达标' : '注意偏离'})
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">⏱</div>
          <div className="kpi-value">{features.avgInterval} <span className="kpi-unit">小时</span></div>
          <div className="kpi-title">平均进食间隔</div>
          <div className="kpi-sub">基准 2.5-3.5h (最长 {features.longestStretchHours}h)</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">🌙</div>
          <div className="kpi-value">{features.nightFeedCount} <span className="kpi-unit">次/夜</span></div>
          <div className="kpi-title">平均夜奶次数</div>
          <div className="kpi-sub">占全天 {Math.round(features.nightRatio * 100)}% (基准 ≤25%)</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">🥛</div>
          <div className="kpi-value">{features.avgBottle} <span className="kpi-unit">ml/天</span></div>
          <div className="kpi-title">奶瓶摄入量</div>
          <div className="kpi-sub">
            基准 {pediatricMetrics.standardDaily}ml (达成率 {Math.round((features.avgBottle / Math.max(1, pediatricMetrics.standardDaily)) * 100)}%)
          </div>
        </div>
      </div>

      {/* 每日趋势对比图（含儿科基准参考线与实测均值对比） */}
      <div className="card">
        <div className="chart-header">
          <div className="card-title" style={{ margin: 0 }}>📈 每日喂养走势与儿科基准对比</div>
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
              <span className="legend-item"><span className="legend-line line-benchmark"></span> 🎯 儿科基准 ({chartBenchmarkValue}次)</span>
              {!isRealMode && chartRealValue > 0 && (
                <span className="legend-item"><span className="legend-line line-real"></span> 📍 宝宝实测 ({chartRealValue}次)</span>
              )}
            </>
          ) : (
            <>
              <span className="legend-item"><span className="legend-dot dot-bottle"></span> 奶瓶总量(ml)</span>
              <span className="legend-item"><span className="legend-line line-benchmark"></span> 🎯 推荐基准 ({chartBenchmarkValue}ml)</span>
              {!isRealMode && chartRealValue > 0 && (
                <span className="legend-item"><span className="legend-line line-real"></span> 📍 宝宝实测 ({chartRealValue}ml)</span>
              )}
            </>
          )}
        </div>

        {/* 柱形走势图容器 */}
        <div className="analytics-bars-container">
          {/* 儿科基准参考虚线 */}
          <div
            className="chart-benchmark-line"
            style={{
              bottom: `${Math.min(92, Math.max(8, (chartBenchmarkValue / chartMaxValue) * 100))}%`,
            }}
          >
            <div className="benchmark-line-badge">
              🎯 推荐线 {chartBenchmarkValue}{chartMetric === 'count' ? '次' : 'ml'}
            </div>
          </div>

          {/* 场景模式下的宝宝实测参考线 */}
          {!isRealMode && chartRealValue > 0 && (
            <div
              className="chart-real-line"
              style={{
                bottom: `${Math.min(92, Math.max(8, (chartRealValue / chartMaxValue) * 100))}%`,
              }}
            >
              <div className="real-line-badge">
                📍 宝宝实测 {chartRealValue}{chartMetric === 'count' ? '次' : 'ml'}
              </div>
            </div>
          )}

          {daysData.map((day, idx) => {
            const isSelected = selectedDayIndex === idx || (selectedDayIndex === null && idx === daysData.length - 1)
            const heightPercent = chartMetric === 'count'
              ? (day.totalFeeds / chartMaxValue) * 100
              : (day.bottleAmount / chartMaxValue) * 100

            const dayPercent = day.totalFeeds > 0 ? (day.dayFeeds / day.totalFeeds) * 100 : 100
            const nightPercent = 100 - dayPercent

            return (
              <div
                key={day.fullDate}
                className={`analytics-bar-col ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDayIndex(idx)}
              >
                <div className="analytics-bar-wrapper">
                  {chartMetric === 'count' ? (
                    <div className="analytics-bar stacked" style={{ height: `${Math.max(day.totalFeeds > 0 ? 8 : 2, heightPercent)}%` }}>
                      <div className="bar-part-night" style={{ height: `${nightPercent}%` }}></div>
                      <div className="bar-part-day" style={{ height: `${dayPercent}%` }}></div>
                    </div>
                  ) : (
                    <div
                      className="analytics-bar single"
                      style={{ height: `${Math.max(day.bottleAmount > 0 ? 8 : 2, heightPercent)}%` }}
                    ></div>
                  )}
                </div>
                <div className="analytics-bar-date">{day.date}</div>
              </div>
            )
          })}
        </div>

        {/* 选定某天的明细卡片 */}
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
              ? '⚠️ 夜奶摄入占比超过 35%，夜间节律尚未完全收敛。'
              : '夜奶占比处于健康成熟区间，昼夜节律发展良好。'}
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
              : '左右侧进食时长基本均衡，有效促进双侧对称泌乳。'}
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
