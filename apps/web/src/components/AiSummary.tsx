import React, { useEffect, useRef, useState } from 'react'
import { aiTypeText, aiTypeList } from '../utils/ai-typewriter'
import { client } from '../lib/orpc'

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

function estimateSavedMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export function AiSummary({ article, open, onToggle }: AiSummaryProps) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [tldr, setTldr] = useState('')
  const [points, setPoints] = useState<string[]>([])
  const [meta, setMeta] = useState('—')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const tldrRef = useRef<HTMLParagraphElement | null>(null)
  const pointsRef = useRef<HTMLUListElement | null>(null)

  useEffect(() => {
    if (open && !busy && !done && !error) {
      void render()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    setDone(false)
    setTldr('')
    setPoints([])
    setMeta('—')
    setBusy(false)
    setError(null)
  }, [article.id])

  async function render() {
    if (busy) return
    setBusy(true)
    setDone(false)
    setTldr('')
    setPoints([])
    setMeta('—')
    setError(null)

    try {
      const res = await client.ai.summarize({ articleId: article.id })

      if (res.queued) {
        setMeta('Folio 摘要 · 已排队生成')
        setTldr('摘要任务已加入队列，稍后刷新文章即可查看。')
        setPoints([])
        setDone(true)
        setBusy(false)
        return
      }

      const summary = res.result.summary
      const keyPoints = res.result.keyPoints.filter(Boolean)
      const saved = estimateSavedMinutes(
        [article.description, summary].filter(Boolean).join(' '),
      )
      setMeta(`Folio 摘要 · 节省 ~${saved} 分钟`)
      setPoints(keyPoints)

      await new Promise((r) => setTimeout(r, 350))
      setDone(true)
      await aiTypeText(tldrRef.current, summary, 26)
      setTldr(summary)
      if (keyPoints.length > 0) {
        await aiTypeList(pointsRef.current, keyPoints, 14)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI 总结失败'
      setError(message)
      setMeta('—')
      setDone(false)
    } finally {
      setBusy(false)
    }
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
            : error
              ? '总结失败 · 点击重试'
              : done
                ? '由 Folio 摘要生成'
                : open
                  ? '加载中…'
                  : '点击展开 · AI 总结'}
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
          {error ? <p className="ai-tldr text-red-500">{error}</p> : null}
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
              disabled={!tldr && points.length === 0}
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
