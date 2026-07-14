/**
 * 把 Date（或时间戳字符串 / number）转成 unix 秒。
 *
 * DB schema 用 `integer('...', { mode: 'timestamp' })` 存时间，
 * pg 驱动不会自动把 JS Date 转成 int，必须显式转。
 */
export function toUnixSeconds(d: Date | string | number): number {
  if (typeof d === 'number') return Math.floor(d)
  if (typeof d === 'string') return Math.floor(new Date(d).getTime() / 1000)
  return Math.floor(d.getTime() / 1000)
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000)
}
