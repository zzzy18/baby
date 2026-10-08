/**
 * 近期宝宝喂养多维场景模拟数据与智能推荐引擎
 */

// 场景预设定义
export const SCENARIO_TYPES = [
  { id: 'steady', label: '🌟 标准平稳型', desc: '昼夜节律良好，生长稳健' },
  { id: 'frequent_night', label: '🌙 夜奶频繁型', desc: '夜醒频繁，起夜负担重' },
  { id: 'breast_imbalance', label: '⚖️ 亲喂单侧失衡', desc: '单侧偏好明显，防大小胸堵奶' },
  { id: 'cluster_feeding', label: '⚡️ 猛长密集期', desc: '傍晚集中挂喂，频繁储能' },
  { id: 'snack_feeding', label: '🍼 零食奶少食多餐', desc: '吃几口就睡，后奶摄入不足' },
]

// 根据场景与天数动态生成历史数据
export function generateFeedingMockData(days = 14, scenario = 'steady') {
  const result = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)

    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const dayName = i === 0 ? '今天' : i === 1 ? '昨天' : weekDays[d.getDay()]

    let baseDayFeeds = 5
    let baseNightFeeds = 2
    let breastMinsLeft = 20
    let breastMinsRight = 20
    let bottleAmount = 650
    let avgInterval = 3.0
    let maxInterval = 4.5

    switch (scenario) {
      case 'frequent_night': // 夜奶频繁
        baseDayFeeds = 5 + Math.round(Math.random() * 2)
        baseNightFeeds = 4 + Math.round(Math.random() * 2) // 夜奶高达 4-6 次
        breastMinsLeft = 15 + Math.round(Math.random() * 8)
        breastMinsRight = 15 + Math.round(Math.random() * 8)
        bottleAmount = 580 + Math.round(Math.random() * 50)
        avgInterval = 2.1
        maxInterval = 2.8
        break

      case 'breast_imbalance': // 单侧严重失衡
        baseDayFeeds = 5 + Math.round(Math.random() * 2)
        baseNightFeeds = 2
        breastMinsLeft = 36 + Math.round(Math.random() * 10)  // 左侧 36-46m (68%)
        breastMinsRight = 14 + Math.round(Math.random() * 6)  // 右侧仅 14-20m (32%)
        bottleAmount = 620 + Math.round(Math.random() * 60)
        avgInterval = 3.1
        maxInterval = 4.8
        break

      case 'cluster_feeding': // 傍晚密集喂养 / 猛长期
        baseDayFeeds = 8 + Math.round(Math.random() * 3) // 白天频次激增
        baseNightFeeds = 2 + Math.round(Math.random())
        breastMinsLeft = 25 + Math.round(Math.random() * 10)
        breastMinsRight = 24 + Math.round(Math.random() * 10)
        bottleAmount = 780 + Math.round(Math.random() * 80) // 奶量激增
        avgInterval = 1.9
        maxInterval = 5.2 // 傍晚密集后，夜间前半程睡长觉
        break

      case 'snack_feeding': // 零食奶少食多餐
        baseDayFeeds = 8 + Math.round(Math.random() * 2)
        baseNightFeeds = 3 + Math.round(Math.random() * 2)
        breastMinsLeft = 7 + Math.round(Math.random() * 3)  // 单次亲喂仅 7-10分钟
        breastMinsRight = 6 + Math.round(Math.random() * 3)
        bottleAmount = 450 + Math.round(Math.random() * 50)
        avgInterval = 1.6
        maxInterval = 2.4
        break

      case 'steady': // 标准平稳型
      default:
        baseDayFeeds = 5 + Math.round(Math.random())
        baseNightFeeds = 1 + Math.round(Math.random())
        breastMinsLeft = 20 + Math.round(Math.random() * 8)
        breastMinsRight = 19 + Math.round(Math.random() * 8)
        bottleAmount = 680 + Math.round(Math.random() * 60)
        avgInterval = 3.2
        maxInterval = 5.2
        break
    }

    result.push({
      date: dateStr,
      dayName,
      fullDate: d.toISOString().slice(0, 10),
      totalFeeds: baseDayFeeds + baseNightFeeds,
      dayFeeds: baseDayFeeds,
      nightFeeds: baseNightFeeds,
      bottleAmount,
      breastDuration: breastMinsLeft + breastMinsRight,
      breastLeft: breastMinsLeft,
      breastRight: breastMinsRight,
      avgInterval,
      maxInterval,
    })
  }
  return result
}

// 24小时时段分布统计（根据不同场景动态呈现差异）
export function getHourlyDistribution(scenario = 'steady') {
  if (scenario === 'frequent_night') {
    return [
      { hour: '00-02', count: 32, label: '午夜', isNight: true, highlight: true },
      { hour: '02-04', count: 36, label: '凌晨', isNight: true, highlight: true },
      { hour: '04-06', count: 28, label: '拂晓', isNight: true },
      { hour: '06-08', count: 20, label: '早晨', isNight: false },
      { hour: '08-10', count: 22, label: '上午', isNight: false },
      { hour: '10-12', count: 20, label: '中午前', isNight: false },
      { hour: '12-14', count: 18, label: '午后', isNight: false },
      { hour: '14-16', count: 20, label: '下午', isNight: false },
      { hour: '16-18', count: 22, label: '傍晚', isNight: false },
      { hour: '18-20', count: 24, label: '晚间', isNight: false },
      { hour: '20-22', count: 26, label: '睡前', isNight: false },
      { hour: '22-24', count: 30, label: '夜初', isNight: true },
    ]
  }

  if (scenario === 'cluster_feeding') {
    return [
      { hour: '00-02', count: 12, label: '午夜', isNight: true },
      { hour: '02-04', count: 14, label: '凌晨', isNight: true },
      { hour: '04-06', count: 16, label: '拂晓', isNight: true },
      { hour: '06-08', count: 22, label: '早晨', isNight: false },
      { hour: '08-10', count: 24, label: '上午', isNight: false },
      { hour: '10-12', count: 22, label: '中午前', isNight: false },
      { hour: '12-14', count: 24, label: '午后', isNight: false },
      { hour: '14-16', count: 28, label: '下午', isNight: false },
      { hour: '16-18', count: 38, label: '密集起', isNight: false, highlight: true },
      { hour: '18-20', count: 48, label: '挂喂峰', isNight: false, highlight: true }, // 极高峰
      { hour: '20-22', count: 36, label: '充能晚', isNight: false, highlight: true },
      { hour: '22-24', count: 14, label: '入睡后', isNight: true },
    ]
  }

  // 默认平稳型
  return [
    { hour: '00-02', count: 16, label: '午夜', isNight: true },
    { hour: '02-04', count: 18, label: '凌晨', isNight: true },
    { hour: '04-06', count: 14, label: '拂晓', isNight: true },
    { hour: '06-08', count: 26, label: '早晨', isNight: false },
    { hour: '08-10', count: 28, label: '上午', isNight: false },
    { hour: '10-12', count: 24, label: '中午前', isNight: false },
    { hour: '12-14', count: 22, label: '午后', isNight: false },
    { hour: '14-16', count: 25, label: '下午', isNight: false },
    { hour: '16-18', count: 29, label: '傍晚', isNight: false },
    { hour: '18-20', count: 35, label: '密集期', isNight: false, highlight: true },
    { hour: '20-22', count: 32, label: '睡前', isNight: false },
    { hour: '22-24', count: 18, label: '夜间', isNight: true },
  ]
}

// 核心场景智能研判引擎 (根据数据指标动态生成完全不同的诊断与处方建议)
export function evaluateFeedingScenario(daysData, scenarioId = 'steady') {
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

  // 场景与建议生成引擎
  let regularityScore = 88
  let diagnosisTitle = '宝宝近期喂养规律良好 🌟'
  let diagnosisDesc = '进食间隔稳固在 3 小时以上，生长能量供给充沛。'
  let recommendations = []

  switch (scenarioId) {
    case 'frequent_night':
      regularityScore = 68
      diagnosisTitle = '夜间起夜偏多，需建立昼夜节律 🌙'
      diagnosisDesc = `当前平均夜奶 ${avgNightFeeds} 次/夜，夜间进食频次较高，容易打乱父母与宝宝的深度睡眠。`
      recommendations = [
        {
          icon: '☀️',
          title: '强化昼夜光线差异',
          desc: '白天喂奶拉开窗帘，多说话互动；夜间喂奶只开微弱暖光地灯，保持安静不逗引，帮助宝宝建立昼夜分泌褪黑素节律。',
        },
        {
          icon: '🧸',
          title: '剥离“奶睡”单一联想',
          desc: '夜间哼唧醒来时，切勿第一时间直接塞乳头/奶瓶。可先观察1-2分钟或轻拍背部接觉，区分宝宝是“真饿”还是单纯“求安抚”。',
        },
        {
          icon: '🍲',
          title: '白天单次喂饱吃透',
          desc: '警惕白天小吃、夜间狂补的“昼夜倒置”。白天每餐尽量充分喂饱，将更多热量摄入转移至日间。',
        },
      ]
      break

    case 'breast_imbalance':
      regularityScore = 74
      diagnosisTitle = '单侧偏好明显，防大小胸与堵奶 ⚖️'
      diagnosisDesc = `当前左侧亲喂时长达 ${leftPct}%，右侧仅占 ${rightPct}%，双侧差异明显，需防范乳腺淤堵。`
      recommendations = [
        {
          icon: '🔄',
          title: '弱侧先吸吮原则',
          desc: `宝宝饥饿时吸吮力最大、刺激排乳反射最强。接下来的 3-5 天内，建议每次喂奶都由右侧（较少侧）先吸吮 15 分钟以上。`,
        },
        {
          icon: '🧘‍♀️',
          title: '调整抱姿舒适度',
          desc: '很多偏好是由于宝宝头部单侧转动习惯或妈妈抱姿不适引起的。可尝试“橄榄球抱姿”在不改变宝宝舒适朝向的情况下吮吸弱侧。',
        },
        {
          icon: '🧊',
          title: '避免充盈侧堵奶',
          desc: `左侧泌乳量大但切忌过度排空以防产奶过盛。右侧吸吮时，左侧若过度胀痛可轻度手挤减压至舒适即可。`,
        },
      ]
      break

    case 'cluster_feeding':
      regularityScore = 82
      diagnosisTitle = '傍晚密集喂养期，储能生理现象 ⚡️'
      diagnosisDesc = `傍晚 17:00-20:00 喂养间隔收窄至 ${avgInterval}h，日均奶量上涨至 ${avgBottle}ml，属于典型储能挂喂期。`
      recommendations = [
        {
          icon: '💆‍♀️',
          title: '无需焦虑“奶水不够”',
          desc: '密集挂喂是新生儿向母体下达“加急下奶订单”的正常生理行为，并非母乳变少。家人可做好后勤保障，让妈妈安心按需亲喂。',
        },
        {
          icon: '🌙',
          title: '迎接夜间长觉先兆',
          desc: '傍晚集中储能吃饱的宝宝，往往在前半夜能睡出连续 4-5 小时以上的较长觉，属于建立睡眠能力的积极信号。',
        },
        {
          icon: '🍵',
          title: '保持水分与高热量补充',
          desc: '高频哺乳消耗大量水分与热量，建议下午提前准备温水、小点心，避免哺乳妈妈疲劳脱水。',
        },
      ]
      break

    case 'snack_feeding':
      regularityScore = 64
      diagnosisTitle = '小餐零食奶模式，警惕后奶不足 🍼'
      diagnosisDesc = `单次喂哺仅约 10-15 分钟且频次高 (${avgDailyFeeds}次/天)，进食零碎，易导致后奶脂肪吸收不足。`
      recommendations = [
        {
          icon: '🥛',
          title: '确保吃到高热量后奶',
          desc: '吃奶前 5 分钟是低热量水分前奶，后 10-15 分钟才是高热量脂肪后奶。若总吃几口就睡，宝宝容易频繁饥饿、便便偏稀。',
        },
        {
          icon: '👂',
          title: '防昏睡小技巧',
          desc: '吃奶时轻抚后颈、松开包被、轻揉小脚丫或换片纸尿裤促其保持清醒，鼓励宝宝单次至少有效吸吮 15-20 分钟。',
        },
        {
          icon: '⏱',
          title: '温和拉长正餐间隔',
          desc: '单次吃饱后，下次哭了先尝试安抚，将间隔逐步拉开至 2.5 ~ 3 小时，建立“规律大餐”而非“随时零食”。',
        },
      ]
      break

    case 'steady':
    default:
      regularityScore = 92
      diagnosisTitle = '黄金规律稳定期，成长节律极佳 🌟'
      diagnosisDesc = `喂养间隔 ${avgInterval}h，夜奶仅 ${avgNightFeeds} 次，最长夜间拉长至 ${maxNightInterval}h，供需与作息非常契合。`
      recommendations = [
        {
          icon: '😴',
          title: '顺应夜间自主拉长',
          desc: `最长睡眠进食间隔已达 ${maxNightInterval} 小时。只要宝宝生长曲线与尿布达标，夜间切勿盲目定闹钟叫醒喂奶。`,
        },
        {
          icon: '⚖️',
          title: '双侧平衡继续保持',
          desc: `双侧亲喂时长比例为 ${leftPct}% vs ${rightPct}%，乳腺刺激完全对称，继续保持交替开奶的良好习惯。`,
        },
        {
          icon: '📅',
          title: '建立“吃-玩-睡”程序',
          desc: '当前良好的规律为建立 EASY 程序（吃奶 -> 互动清醒 -> 入睡）创造了最佳条件，有利于预防后续睡眠倒退。',
        },
      ]
      break
  }

  return {
    avgDailyFeeds,
    avgBottle,
    avgBreastMins,
    leftPct,
    rightPct,
    avgNightFeeds,
    avgInterval,
    maxNightInterval,
    regularityScore,
    diagnosisTitle,
    diagnosisDesc,
    recommendations,
  }
}
