/**
 * 将时间戳格式化为"X 分钟前 / X 小时前 / X 天前"等相对时间。
 * 支持 Date、ISO 字符串、秒级/毫秒级数字时间戳。
 */
export function formatRelativeTime(input: Date | number | string | null | undefined): string {
  if (input == null) return ''

  let ms: number
  if (input instanceof Date) {
    ms = input.getTime()
  } else if (typeof input === 'number') {
    ms = input < 1e12 ? input * 1000 : input
  } else {
    const asNum = Number(input)
    if (!Number.isNaN(asNum) && input.trim() !== '') {
      ms = asNum < 1e12 ? asNum * 1000 : asNum
    } else {
      ms = new Date(input).getTime()
    }
  }

  if (Number.isNaN(ms)) return ''

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
