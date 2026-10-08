/**
 * 宝宝基础档案与儿科医学喂养推算引擎 (Baby Profile & Pediatric Calculations)
 * 核心公式：
 * - 每日液体/奶量基准：120 ~ 150 ml / kg / day (WHO / AAP 标准)
 * - 单次胃容量：随月龄与体重递增
 */

// 默认宝宝档案（支持本地持久化存储）
const STORAGE_KEY = 'baby_profile_data'

export function getBabyProfile() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try { return JSON.parse(saved) } catch (e) {}
  }
  // 默认：生后约 45 天，体重 4.6 kg 的健康宝宝
  const defaultBirthday = new Date()
  defaultBirthday.setDate(defaultBirthday.getDate() - 45)

  return {
    name: '悠悠',
    gender: 'girl', // boy | girl
    birthday: defaultBirthday.toISOString().slice(0, 10),
    weightKg: 4.6, // 体重 kg
    headCircumferenceCm: 37.5,
    heightCm: 56.0,
  }
}

export function saveBabyProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

/**
 * 根据出生日期精确计算日龄、月龄描述
 */
export function calculateBabyAge(birthdayStr) {
  const bDate = new Date(birthdayStr)
  const now = new Date()
  const diffTime = Math.max(0, now - bDate)
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  const months = Math.floor(totalDays / 30)
  const remainDays = totalDays % 30

  let ageText = `生后 ${totalDays} 天`
  if (months > 0) {
    ageText = `${months}个月${remainDays > 0 ? `${remainDays}天` : ''} (生后${totalDays}天)`
  }

  return {
    totalDays,
    months,
    remainDays,
    ageText,
    isNewborn: totalDays <= 28, // 是否新生儿期 (<=28天)
  }
}

/**
 * 基于月龄与体重计算儿科推荐喂养参数
 */
export function getRecommendedFeedingMetrics(weightKg, totalDays) {
  const weight = parseFloat(weightKg) || 4.5

  // 1. 每日总奶量推荐范围：120 - 150 ml/kg/day (上限一般控制在 960ml 防止过度喂养)
  const minDaily = Math.round(weight * 120)
  const standardDaily = Math.round(Math.min(960, weight * 150))
  const maxDaily = Math.round(Math.min(1000, weight * 160))

  // 2. 单次推荐胃容量区间（结合月龄递增）
  let minPerFeed = 60
  let maxPerFeed = 90
  let suggestedFrequency = '8-10次/天'

  if (totalDays <= 7) {
    minPerFeed = 30
    maxPerFeed = 60
    suggestedFrequency = '8-12次/天'
  } else if (totalDays <= 14) {
    minPerFeed = 60
    maxPerFeed = 80
    suggestedFrequency = '8-10次/天'
  } else if (totalDays <= 30) {
    minPerFeed = 80
    maxPerFeed = 110
    suggestedFrequency = '7-9次/天'
  } else if (totalDays <= 60) { // 1-2个月
    minPerFeed = 90
    maxPerFeed = 130
    suggestedFrequency = '6-8次/天'
  } else if (totalDays <= 90) { // 2-3个月
    minPerFeed = 120
    maxPerFeed = 150
    suggestedFrequency = '6-7次/天'
  } else { // 3个月以上
    minPerFeed = 140
    maxPerFeed = 180
    suggestedFrequency = '5-6次/天'
  }

  // 单次母乳建议亲喂时长
  const recommendedBreastMins = totalDays <= 14 ? '20-30分钟' : '15-20分钟'

  return {
    weightKg: weight,
    minDaily,
    standardDaily,
    maxDaily,
    minPerFeed,
    maxPerFeed,
    suggestedFrequency,
    recommendedBreastMins,
  }
}
