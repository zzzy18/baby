/**
 * 深度儿科与泌乳临床规则引擎 (Deep Pediatric & Lactation Clinical Rules Engine)
 * 涵盖：月龄基准对照、交叉充足度验证、昼夜节律评估、双侧对称性、肠胃舒适度与集群喂哺鉴别
 */

// 5大维度的综合评分权重模型
export function calculateMultidimensionalScores(features) {
  // 1. 昼夜成熟分 (夜间进食比率、最长睡眠拉长)
  let circadianScore = 90
  if (features.nightFeedCount > 3) circadianScore -= 20
  if (features.longestStretchHours >= 4.5) circadianScore += 8
  if (features.nightRatio > 0.35) circadianScore -= 15
  circadianScore = Math.min(100, Math.max(50, circadianScore))

  // 2. 亲喂对称分 (左右时长偏差)
  let symmetryScore = 95
  const diff = Math.abs(features.leftPct - features.rightPct)
  if (diff > 10) symmetryScore -= (diff - 10) * 1.8
  symmetryScore = Math.min(100, Math.max(45, Math.round(symmetryScore)))

  // 3. 规律节律分 (进食间隔稳定性)
  let regularityScore = 88
  if (features.avgInterval >= 2.8 && features.avgInterval <= 3.6) regularityScore += 8
  else if (features.avgInterval < 2.0) regularityScore -= 22
  regularityScore = Math.min(100, Math.max(50, Math.round(regularityScore)))

  // 4. 消化舒适分 (单次时长、避免零食奶与过度喂养)
  let digestiveScore = 85
  if (features.singleFeedEfficiency === 'snack') digestiveScore -= 25
  if (features.hasClusterColicAlert) digestiveScore -= 15
  digestiveScore = Math.min(100, Math.max(50, Math.round(digestiveScore)))

  // 5. 摄入充沛分 (综合总奶量与频次)
  let adequacyScore = 92
  if (features.avgDailyFeeds < 5) adequacyScore -= 20
  else if (features.avgDailyFeeds > 11) adequacyScore -= 15
  adequacyScore = Math.min(100, Math.max(55, Math.round(adequacyScore)))

  const totalScore = Math.round(
    circadianScore * 0.25 +
    symmetryScore * 0.2 +
    regularityScore * 0.2 +
    digestiveScore * 0.15 +
    adequacyScore * 0.2
  )

  return {
    totalScore,
    circadianScore,
    symmetryScore,
    regularityScore,
    digestiveScore,
    adequacyScore,
  }
}

/**
 * 深度临床规则匹配引擎
 * 针对当前数据输出多维医学评估、生理机制解读、行动策略与宜忌清单
 */
export function evaluateDeepClinicalRules(features) {
  const evaluations = []

  // ================= 规则 1：昼夜节律与长睡眠窗口识别 =================
  if (features.longestStretchHours >= 4.5 && features.nightFeedCount <= 2) {
    evaluations.push({
      id: 'circadian_consolidating',
      domain: '昼夜节律与睡眠',
      level: 'green', // green | yellow | orange | red
      levelText: '🌟 极佳进展',
      title: '夜间长睡眠窗口巩固期（整觉发展信号）',
      phenomenon: `最长进食间隔已达 ${features.longestStretchHours} 小时，夜间喂奶降至 ${features.nightFeedCount} 次，长觉多发生在夜间 22:00-04:00。`,
      medicalMechanism: '婴儿下丘脑视交叉上核 (SCN) 正在成熟，夜间褪黑素与生长激素脉冲式分泌规律建立，深睡眠循环正由浅睡片段逐渐串联。',
      actionPlan: [
        '顺应宝宝自主拉长：若体重增长与尿布数量达标，夜间切勿定闹钟盲目叫醒喂奶。',
        '夜奶极简处理：夜间喂哺保持暗光、不逗笑、不换尿布（除非便便），吃完轻拍即放下。',
        '晨间固定唤醒：早晨 07:00 左右拉开窗帘见自然光，锚定全天第一餐时间。',
      ],
      dos: ['夜间保持静音暗光低刺激', '观察是否能自主接觉翻身重睡'],
      donts: ['定闹钟强行叫醒喂奶', '夜间开大灯或大声逗玩'],
    })
  } else if (features.nightFeedCount >= 4 || features.nightRatio > 0.35) {
    evaluations.push({
      id: 'circadian_inversion',
      domain: '昼夜节律与睡眠',
      level: 'orange',
      levelText: '⚠️ 重点关注',
      title: '夜间喂养频次偏高（昼夜颠倒 / 奶睡依赖倾向）',
      phenomenon: `夜奶频次达 ${features.nightFeedCount} 次/夜，夜间摄入占比高达 ${Math.round(features.nightRatio * 100)}%，睡眠片段高度破碎。`,
      medicalMechanism: '可能存在“日夜颠倒”或强烈的“含乳接觉联想”。宝宝在轻度微觉醒阶段无法自主重新入眠，误将吸吮作为唯一的哄睡工具。',
      actionPlan: [
        '白天重置生物钟：白天醒来期间保证充分光照与俯卧趴玩（Tummy Time），消耗体能。',
        '前置安抚梯度：夜间微觉醒时先等待 2-3 分钟，再尝试嘘拍、轻抚或安抚巾，区分“生理真饿”与“睡眠接觉困惑”。',
        '日间卡路里搬家：白天每餐确保吃饱吃透，防止“白天小鸡啄米、夜间高频进补”的倒置循环。',
      ],
      dos: ['白天每餐喂足喂透', '夜醒先延迟响应 2 分钟建立自主能力'],
      donts: ['一哼唧立刻秒塞奶头', '白天黑屋静音过度保护'],
    })
  }

  // ================= 规则 2：亲喂左右乳腺平衡与偏侧风险 =================
  const sideDiff = Math.abs(features.leftPct - features.rightPct)
  if (sideDiff >= 20) {
    const weakerSide = features.leftPct < features.rightPct ? '左侧' : '右侧'
    const strongerSide = features.leftPct < features.rightPct ? '右侧' : '左侧'
    const weakerPct = Math.min(features.leftPct, features.rightPct)
    const strongerPct = Math.max(features.leftPct, features.rightPct)

    evaluations.push({
      id: 'breast_asymmetry',
      domain: '乳腺健康与供需',
      level: sideDiff >= 30 ? 'red' : 'yellow',
      levelText: sideDiff >= 30 ? '🚨 高危偏侧' : '⚠️ 需调整',
      title: `亲喂单侧偏好明显（大小胸与堵奶风险）`,
      phenomenon: `${strongerSide}亲喂占比达 ${strongerPct}%，而${weakerSide}仅占 ${weakerPct}%，双侧吸吮时长失衡超 ${sideDiff}%。`,
      medicalMechanism: '乳腺泌乳遵循“移出越多产奶越多”的自控机制 (FIL)。单侧过度刺激会导致该侧乳腺组织增生，而弱侧逐渐退化回奶，极易引发淤积性乳腺炎。',
      actionPlan: [
        `饥饿先吮弱侧：每次开奶前，让宝宝先吸吮${weakerSide} 15-20 分钟（此时吸吮力最强、刺激催产素反射最高效）。`,
        '调整哺乳姿势：若宝宝因斜颈或偏头不喜转头，采用“橄榄球抱姿”在不改变宝宝舒适朝向的情况下吮吸弱侧。',
        `强侧防胀处理：强侧胀奶严重时，仅手挤减压至舒适即可，切忌完全吸空以防产奶过剩。`,
      ],
      dos: [`优先由${weakerSide}开奶`, '哺乳前对弱侧轻度温敷激活喷乳反射'],
      donts: ['顺从宝宝只喂优势侧', '强侧胀痛时用力暴力揉搓'],
    })
  } else {
    evaluations.push({
      id: 'breast_symmetry_good',
      domain: '乳腺健康与供需',
      level: 'green',
      levelText: '✓ 平衡良好',
      title: '双侧亲喂时长对称健康',
      phenomenon: `左侧 ${features.leftPct}% vs 右侧 ${features.rightPct}%，双侧差异小于 10%，维持理想的交替刺激。`,
      medicalMechanism: '双侧乳腺小叶受催乳素与催产素对称刺激，双乳泌乳量与组织发育保持同步，堵奶概率处于临床低风险位。',
      actionPlan: [
        '记录开奶侧别：继续保持“上次哪侧结束，下次哪侧开始”的轮替节奏。',
        '两边各喂透：建议单侧吃透 15 分钟以上再换边，兼顾前后奶均衡。',
      ],
      dos: ['保持单次轮替开奶习惯'],
      donts: ['长时间单侧挂喂'],
    })
  }

  // ================= 规则 3：傍晚密集喂养 (Cluster) vs 肠胀气绞痛鉴别 =================
  if (features.clusterDetected) {
    evaluations.push({
      id: 'cluster_feeding_diagnosis',
      domain: '行为模式与肠胃',
      level: 'yellow',
      levelText: '⚡️ 密集生理期',
      title: '傍晚集群喂哺 (Cluster Feeding) 识别与鉴别',
      phenomenon: `每天傍晚 17:00-20:00 期间喂奶间隔缩紧至 1.5-1.9h，日均奶量出现脉冲波峰。`,
      medicalMechanism: '此为婴儿本能的“傍晚加餐储能”行为，旨在为后半夜较长深睡眠积蓄热量；同时通过高频刺激向母体下达“生长高峰期催奶单”。',
      actionPlan: [
        '鉴别肠胀气：若宝宝含乳后平静吞咽即为集群吃奶；若吃几口就吐乳、蹬腿哭闹、腹部胀鼓，则为肠胀气（需暂停喂奶做排气操）。',
        '顺应按需哺乳：不必按照白天的固定间隔教条限制，此时给足皮肤接触与陪伴。',
        '妈妈下午提前补水补餐：下午 16:00 备好温热点心与汤水，避免晚间哺乳脱水透支。',
      ],
      dos: ['下午提前做好营养与体力储备', '吃奶后充分竖抱拍嗝'],
      donts: ['怀疑母乳不足仓促加配方奶', '强行拉开傍晚吃奶间隔'],
    })
  }

  // ================= 规则 4：单次进食效率与零食奶/后奶吸收 =================
  if (features.avgBreastMinsPerFeed < 10 && features.avgDailyFeeds >= 9) {
    evaluations.push({
      id: 'snack_feeding_alert',
      domain: '营养吸收与消化',
      level: 'orange',
      levelText: '🍼 零食奶警示',
      title: '少食多餐零食奶模式（警惕高热量后奶摄入不足）',
      phenomenon: `单次有效亲喂仅约 ${features.avgBreastMinsPerFeed} 分钟，日进食频次高达 ${features.avgDailyFeeds} 次，吃奶碎片化。`,
      medicalMechanism: '乳汁分为水分糖分高的“前奶”与脂肪热量高的“后奶”。单次吸吮不足10分钟便昏睡，宝宝基本只摄入前奶，胃排空极快，且易出现乳糖不耐受导致的绿便泡沫便。',
      actionPlan: [
        '哺乳防昏睡激活法：宝宝吃 5 分钟后开始迷糊时，轻弹脚心、搓揉耳廓、解开襁褓或更换尿布，保持清醒吸满 15-20 分钟。',
        '单侧吃透再换边：切勿 5 分钟换一次边，确保一侧充分排空并吸出富含脂肪的后奶。',
        '温和拉开餐次：单次喂饱后，下次哼唧先轻拍安抚，将间隔逐步拉开至 2.5 小时，建立“正餐胃容积”。',
      ],
      dos: ['确保单侧吃满 15-20 分钟', '观察大便是否呈金黄色膏状'],
      donts: ['频繁换边导致只喝到稀薄前奶', '宝宝一闭眼就拔出乳头'],
    })
  }

  // ================= 规则 5：摄入总量与月龄体重标准对齐 =================
  const targetStandard = Math.round(features.weightKg * 150)
  const minStandard = Math.round(features.weightKg * 120)
  const maxStandard = Math.round(features.weightKg * 160)

  let adequacyLevel = 'green'
  let adequacyTitle = `摄入量与 ${features.weightKg}kg 体重完美契合 (120-150ml/kg 黄金区间)`
  let adequacyLevelText = '✓ 供给充足'
  let adequacyDesc = `宝宝当前生后 ${features.totalDays} 天、体重 ${features.weightKg} kg。日均奶量 ${features.avgBottle} ml，位于体重推荐区间 (${minStandard} - ${targetStandard} ml)。`

  if (features.avgBottle < minStandard && features.avgDailyFeeds < 6) {
    adequacyLevel = 'orange'
    adequacyLevelText = '⚠️ 摄入偏低'
    adequacyTitle = `摄入量低于体重健康基准线 (${minStandard}ml)`
    adequacyDesc = `当前日均仅 ${features.avgBottle} ml，低于当前体重最低推荐线 (${minStandard}ml，即 120ml/kg)。需密切观察排尿量（湿尿布是否≥6片）并评估是否需要积极追奶。`
  } else if (features.avgBottle > maxStandard) {
    adequacyLevel = 'yellow'
    adequacyLevelText = '⚠️ 警惕过量'
    adequacyTitle = `摄入量高于体重标准需求 (${maxStandard}ml)`
    adequacyDesc = `当前日均达 ${features.avgBottle} ml，超出体重标准上限。瓶喂时警惕因奶嘴流速过快导致吞咽不自主过度喂养，加重婴儿胃肠负担。`
  }

  evaluations.push({
    id: 'intake_adequacy_by_weight',
    domain: '月龄体重与摄入',
    level: adequacyLevel,
    levelText: adequacyLevelText,
    title: adequacyTitle,
    phenomenon: adequacyDesc,
    medicalMechanism: `根据 WHO 与 AAP 婴儿营养标准，小婴儿能量消耗约为 100-120 kcal/kg/day，对应奶量为 120-150 ml/kg/day。胃容量随着日龄自核桃大小逐步扩展至拳头大小。`,
    actionPlan: [
      `定期跟踪体重曲线：每周同一时间裸重称量，当前月龄每周健康增重基准为 150-200g。`,
      `双向观察饱腹信号：吃饱后松拳、推开奶嘴、安睡 2-3 小时；避免用吃奶作为唯一哭闹抚平手段。`,
      `排泄交叉验证：每天保证 5-6 片沉甸甸的湿尿布即可确认水分热量充足，不必为单次少喝 10ml 焦虑。`,
    ],
    dos: [`按 ${features.weightKg}kg 体重标准科学评估每日摄入`, '观察精神状态与排尿尿色（清亮淡黄为佳）'],
    donts: ['死搬硬套刻度强行逼喂', '单次奶量盲目加量超过当前胃容量'],
  })

  return evaluations
}

// 高级场景特征抽取器（已注入月龄天数与当前体重）
export function extractClinicalFeatures(daysData, scenario = 'steady', weightKg = 4.6, totalDays = 45) {
  const totalDaysCount = daysData.length || 1
  const validDays = (daysData || []).filter(d => d.totalFeeds > 0)
  // 若是真实数据，优先按有效打卡天数计算日均，避免未打卡天数稀释真实均值
  const effectiveDaysCount = (scenario === 'real' && validDays.length > 0) ? validDays.length : totalDaysCount

  const totalFeeds = daysData.reduce((acc, d) => acc + d.totalFeeds, 0)
  const avgDailyFeeds = Number((totalFeeds / effectiveDaysCount).toFixed(1))

  const totalBottle = daysData.reduce((acc, d) => acc + d.bottleAmount, 0)
  const avgBottle = Math.round(totalBottle / effectiveDaysCount)

  const totalBreastMins = daysData.reduce((acc, d) => acc + d.breastDuration, 0)
  const avgBreastMins = Math.round(totalBreastMins / effectiveDaysCount)
  const avgBreastMinsPerFeed = Math.round(avgBreastMins / Math.max(1, avgDailyFeeds))

  const totalLeft = daysData.reduce((acc, d) => acc + d.breastLeft, 0)
  const totalRight = daysData.reduce((acc, d) => acc + d.breastRight, 0)
  const totalSides = totalLeft + totalRight || 1
  const leftPct = Math.round((totalLeft / totalSides) * 100)
  const rightPct = 100 - leftPct

  const totalNight = daysData.reduce((acc, d) => acc + d.nightFeeds, 0)
  const nightFeedCount = Number((totalNight / effectiveDaysCount).toFixed(1))
  const nightRatio = Number((totalNight / Math.max(1, totalFeeds)).toFixed(2))

  const activeIntervalDays = (scenario === 'real' && validDays.length > 0) ? validDays : daysData
  const avgInterval = Number((activeIntervalDays.reduce((acc, d) => acc + (d.avgInterval || 3.0), 0) / Math.max(1, activeIntervalDays.length)).toFixed(1))
  const longestStretchHours = Number(Math.max(...daysData.map(d => d.maxInterval || 3.0)).toFixed(1))

  const isReal = scenario === 'real'
  const clusterDetected = isReal ? (avgDailyFeeds >= 9 && avgInterval <= 2.2) : (scenario === 'cluster_feeding')
  const singleFeedEfficiency = isReal ? (avgBreastMinsPerFeed < 10 && avgDailyFeeds >= 8 ? 'snack' : 'optimal') : (scenario === 'snack_feeding' ? 'snack' : 'optimal')
  const hasClusterColicAlert = isReal ? (clusterDetected && nightRatio > 0.3) : (scenario === 'cluster_feeding')

  return {
    weightKg: parseFloat(weightKg) || 4.6,
    totalDays: parseInt(totalDays) || 45,
    avgDailyFeeds,
    avgBottle,
    avgBreastMins,
    avgBreastMinsPerFeed,
    leftPct,
    rightPct,
    nightFeedCount,
    nightRatio,
    avgInterval,
    longestStretchHours,
    clusterDetected,
    singleFeedEfficiency,
    hasClusterColicAlert,
    isReal,
    hasRealData: totalFeeds > 0,
    validDaysCount: validDays.length,
  }
}
