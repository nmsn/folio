/**
 * 字符逐个 typewriter 动画。中英文标点自动延长停顿。
 */
export function aiTypeText(el: HTMLElement | null, text: string, speed = 26): Promise<void> {
  return new Promise((resolve) => {
    if (!el) {
      resolve()
      return
    }
    el.textContent = ''
    const cur = document.createElement('span')
    cur.className = 'ai-cursor'
    el.appendChild(cur)
    let i = 0
    const tick = () => {
      if (i >= text.length) {
        if (cur.parentNode) cur.parentNode.removeChild(cur)
        resolve()
        return
      }
      const ch = text.charAt(i)
      cur.before(document.createTextNode(ch))
      i++
      let d = speed
      if ('。.!?！？\n'.indexOf(ch) >= 0) d = speed * 7
      else if ('，,;；、'.indexOf(ch) >= 0) d = speed * 4
      setTimeout(tick, d)
    }
    tick()
  })
}

/**
 * 列表逐项 typewriter。每个 li 元素独立 animate。
 */
export function aiTypeList(ul: HTMLElement | null, items: string[], speed = 14): Promise<void> {
  if (!ul) return Promise.resolve()
  return items.reduce<Promise<void>>(
    (p, text, idx) =>
      p.then(() => {
        const li = ul.children[idx] as HTMLElement | undefined
        if (!li) return
        return aiTypeText(li, `${idx + 1}. ${text}`, speed)
      }),
    Promise.resolve(),
  )
}
