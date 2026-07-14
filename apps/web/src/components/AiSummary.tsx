import React, { useEffect, useRef, useState } from 'react'
import { aiTypeText, aiTypeList } from '../utils/ai-typewriter'
import { getMockAiSummary } from '../data/mock-ai-summaries'

interface AiSummaryProps {
  article: {
    id: string
    title: string
    url?: string
    description?: string | null
  }
  open: boolean
  onToggle: () => void
}

export function AiSummary({ article, open, onToggle }: AiSummaryProps) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [tldr, setTldr] = useState('')
  const [points, setPoints] = useState<string[]>([])
  const [meta, setMeta] = useState('—')
  const [copied, setCopied] = useState(false)

  const tldrRef = useRef<HTMLParagraphElement | null>(null)
  const pointsRef = useRef<HTMLUListElement | null>(null)

  // 首次打开时启动 typewriter
  useEffect(() => {
    if (open && !busy && !done) {
      void render()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 切换文章时重置状态
  useEffect(() => {
    setDone(false)
    setTldr('')
    setPoints([])
    setMeta('—')
    setBusy(false)
  }, [article.id])

  async function render() {
    if (busy) return
    setBusy(true)
    setDone(false)
    setTldr('')
    setPoints([])
    setMeta('—')
    const s = getMockAiSummary(article)
    setMeta(`${s.source} · 节省 ~${s.saved} 分钟`)
    setPoints(s.points)
    // 等 350ms 让折叠展开动画播完
    await new Promise((r) => setTimeout(r, 350))
    setDone(true)
    await aiTypeText(tldrRef.current, s.tldr, 26)
    setTldr(s.tldr) // 同步 state 用于复制
    await aiTypeList(pointsRef.current, s.points, 14)
    setBusy(false)
  }

  const copySummary = async () => {
    const lines = [tldr.trim(), ...points].filter(Boolean).join('\n')
    const doneCb = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(lines)
        doneCb()
      } catch {
        doneCb()
      }
    } else {
      doneCb()
    }
  }

  return (
    <aside
      className={`ai-summary ${open ? 'is-open' : ''} ${busy ? 'is-loading' : ''} ${done ? 'is-done' : ''}`}
      aria-expanded={open}
    >
      <button className="ai-head" type="button" onClick={onToggle} aria-controls="aiBody">
        <span className="ai-badge">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          AI 总结
        </span>
        <span className="ai-status">
          {busy
            ? '正在总结…'
            : done
              ? '由 Folio 摘要生成'
              : open
                ? '加载中…'
                : '点击展开 · 节省 ~6 分钟'}
        </span>
        <span className="ai-chev">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div className="ai-body" id="aiBody">
        <div className="ai-body-inner">
          <p className="ai-tldr" ref={tldrRef}>
            {tldr}
          </p>
          <ul className="ai-points" ref={pointsRef}>
            {points.map((_, i) => (
              <li key={i} />
            ))}
          </ul>
          <div className="ai-foot">
            <span className="ai-meta">{meta}</span>
            <div style={{ flex: 1 }} />
            <button
              className={`ai-act ${copied ? 'is-copied' : ''}`}
              type="button"
              onClick={copySummary}
            >
              {copied ? '已复制' : '复制'}
            </button>
            <button className="ai-act" type="button" onClick={render}>
              重新生成
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
