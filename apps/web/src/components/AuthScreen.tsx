import React, { useState } from 'react'

type Mode = 'signin' | 'signup'

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<unknown>
  onSignUp: (name: string, email: string, password: string) => Promise<unknown>
}

export function AuthScreen({ onSignIn, onSignUp }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signin') {
        await onSignIn(email.trim(), password)
      } else {
        await onSignUp(name.trim(), email.trim(), password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <span className="dot" />
          Folio
        </div>
        <h1>{mode === 'signin' ? '登录' : '注册'}</h1>
        <p className="auth-sub">
          {mode === 'signin' ? '使用邮箱继续阅读订阅' : '创建账号开始管理 RSS'}
        </p>

        {mode === 'signup' && (
          <label className="auth-field">
            <span>名称</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              minLength={1}
              disabled={busy}
            />
          </label>
        )}

        <label className="auth-field">
          <span>邮箱</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={busy}
          />
        </label>

        <label className="auth-field">
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            disabled={busy}
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? '请稍候…' : mode === 'signin' ? '登录' : '注册'}
        </button>

        <p className="auth-switch">
          {mode === 'signin' ? (
            <>
              还没有账号？{' '}
              <button type="button" onClick={() => setMode('signup')} disabled={busy}>
                注册
              </button>
            </>
          ) : (
            <>
              已有账号？{' '}
              <button type="button" onClick={() => setMode('signin')} disabled={busy}>
                登录
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  )
}
