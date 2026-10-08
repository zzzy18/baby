/**
 * 日期时间工具函数：严格基于北京时间 (Asia/Shanghai, UTC+8)
 */

/**
 * 获取当前北京时间的 datetime-local 格式字符串：YYYY-MM-DDTHH:mm
 */
export function getBeijingNowString() {
  const d = new Date()
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return formatter.format(d).replace(' ', 'T')
}

/**
 * 解析后端返回的日期字符串为 Date 对象
 * 若后端返回 naive 时间（如 2026-10-08T16:30:00），默认当做北京时间 (+08:00) 解析
 */
export function parseBeijingDate(dateStr) {
  if (!dateStr) return new Date()
  if (typeof dateStr !== 'string') return new Date(dateStr)
  // 如果末尾没有 Z 且不包含 + 或 - 时区偏移，补上 +08:00
  if (!dateStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr + '+08:00')
  }
  return new Date(dateStr)
}

/**
 * 格式化为 HH:mm（北京时间）
 */
export function formatClock(dateStr) {
  const d = parseBeijingDate(dateStr)
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/**
 * 格式化为 M月d日 HH:mm（北京时间）
 */
export function formatFullTime(dateStr) {
  const d = parseBeijingDate(dateStr)
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/**
 * 相对时间描述（如：刚刚、15分钟前、2小时前、昨天等）
 */
export function formatRelativeTime(dateStr) {
  const d = parseBeijingDate(dateStr)
  const now = new Date()
  const diffMinutes = Math.floor((now - d) / 60000)
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  const h = Math.floor(diffMinutes / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}
