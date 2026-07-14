/**
 * 将时间戳格式化为"X 分钟前 / X 小时前 / X 天前"等相对时间。
 * 支持 Date 对象或秒级/毫秒级数字时间戳。
 * 不引入新依赖，使用浏览器内置的 Intl.RelativeTimeFormat。
 */
export function formatRelativeTime(input: Date | number | string | null | undefined): string {
  if (input == null) return ''

  let ms: number
  if (input instanceof Date) {
    ms = input.getTime()
  } else {
    const num = typeof input === 'number' ? input : Number(input)
    if (isNaN(num)) return ''
    // 数据库返回的可能是秒级时间戳（drizzle integer mode='timestamp' 默认是秒）
    // 通过数值大小判断：> 1e12 视为毫秒，否则视为秒
    ms = num < 1e12 ? num * 1000 : num
  }

  const date = new Date(ms)
  if (isNaN(date.getTime())) return ''

  const diffSec = Math.round((ms - Date.now()) / 1000)
  const absSec = Math.abs(diffSec)

  const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })

  if (absSec < 60) return rtf.format(diffSec, 'second')
  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (absSec < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day')
  if (absSec < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), 'month')
  return rtf.format(Math.round(diffSec / (86400 * 365)), 'year')
}
