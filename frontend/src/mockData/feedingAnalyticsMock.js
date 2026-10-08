/**
 * 近期宝宝喂养情况模拟数据集 (支持 7天、14天、30天多维度统计分析)
 */

// 模拟历史每天的数据 (过去 30 天)
export function generateFeedingMockData(days = 14) {
  const result = []
  const today = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const dayName = i === 0 ? '今天' : i === 1 ? '昨天' : weekDays[d.getDay()]

    // 随着时间推移，宝宝越来越大：总奶量略升，夜奶略降，间隔略长
    const progress = (days - i) / days
    const baseDayFeeds = 5 + Math.round(Math.random() * 2)
    const baseNightFeeds = Math.max(1, Math.round(3 - progress * 1.2 + (Math.random() * 0.8 - 0.4)))
    const breastMinsLeft = 20 + Math.round(Math.random() * 15)
    const breastMinsRight = 18 + Math.round(Math.random() * 18)
    const bottleAmount = Math.round(350 + progress * 80 + (Math.random() * 60 - 30))

    result.push({
      date: dateStr,
      dayName,
      fullDate: d.toISOString().slice(0, 10),
      totalFeeds: baseDayFeeds + baseNightFeeds,
      dayFeeds: baseDayFeeds,
      nightFeeds: baseNightFeeds,
      bottleAmount,          // ml
      breastDuration: breastMinsLeft + breastMinsRight, // 分钟
      breastLeft: breastMinsLeft,
      breastRight: breastMinsRight,
      avgInterval: Number((2.8 + progress * 0.4 + (Math.random() * 0.3 - 0.15)).toFixed(1)), // 小时
      maxInterval: Number((4.0 + progress * 1.5 + (Math.random() * 0.5 - 0.2)).toFixed(1)), // 最长间隔
    })
  }
  return result
}

// 24小时时段分布统计 (基于典型新生儿吃奶规律)
export const HOURLY_FEEDING_DISTRIBUTION = [
  { hour: '00-02', count: 18, label: '午夜', isNight: true },
  { hour: '02-04', count: 22, label: '凌晨', isNight: true },
  { hour: '04-06', count: 16, label: '拂晓', isNight: true },
  { hour: '06-08', count: 26, label: '早晨', isNight: false },
  { hour: '08-10', count: 28, label: '上午', isNight: false },
  { hour: '10-12', count: 24, label: '中午前', isNight: false },
  { hour: '12-14', count: 22, label: '午后', isNight: false },
  { hour: '14-16', count: 25, label: '下午', isNight: false },
  { hour: '16-18', count: 29, label: '傍晚', isNight: false },
  { hour: '18-20', count: 35, label: '密集期', isNight: false, highlight: true }, // Cluster feeding
  { hour: '20-22', count: 32, label: '睡前', isNight: false },
  { hour: '22-24', count: 20, label: '夜间', isNight: true },
]

// 智能喂养洞察分析汇总
export function getFeedingInsights(daysData) {
  const totalDays = daysData.length
  const totalFeeds = daysData.reduce((acc, d) => acc + d.totalFeeds, 0)
  const avgDailyFeeds = (totalFeeds / totalDays).toFixed(1)

  const totalBottle = daysData.reduce((acc, d) => acc + d.bottleAmount, 0)
  const avgBottle = Math.round(totalBottle / totalDays)

  const totalBreastMins = daysData.reduce((acc, d) => acc + d.breastDuration, 0)
  const avgBreastMins = Math.round(totalBreastMins / totalDays)

  const totalLeft = daysData.reduce((acc, d) => acc + d.breastLeft, 0)
  const totalRight = daysData.reduce((acc, d) => acc + d.breastRight, 0)
  const totalSides = totalLeft + totalRight || 1
  const leftPct = Math.round((totalLeft / totalSides) * 100)
  const rightPct = 100 - leftPct

  const avgNightFeeds = (daysData.reduce((acc, d) => acc + d.nightFeeds, 0) / totalDays).toFixed(1)
  const avgInterval = (daysData.reduce((acc, d) => acc + d.avgInterval, 0) / totalDays).toFixed(1)
  const maxNightInterval = Math.max(...daysData.map(d => d.maxInterval)).toFixed(1)

  return {
    avgDailyFeeds,
    avgBottle,
    avgBreastMins,
    leftPct,
    rightPct,
    avgNightFeeds,
    avgInterval,
    maxNightInterval,
    regularityScore: 88, // 喂养规律度评分
  }
}
