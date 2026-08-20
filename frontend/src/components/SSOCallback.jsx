import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const EXCHANGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sso-exchange`
const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://apps.stellarglobalsupplies.com'
const MAX_AGE_MS  = 5 * 60 * 1000

function safeRedirect(redirect, fallback = '/') {
  try {
    const url = new URL(redirect, window.location.origin)
    if (url.origin !== window.location.origin) return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return redirect.startsWith('/') ? redirect : fallback
  }
}

export default function SSOCallback() {
  const [status, setStatus] = useState('Verifying your session…')
  const [error,  setError]  = useState(null)

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search)
    const token    = params.get('token')
    const ts       = Number(params.get('ts') || 0)
    const redirect = safeRedirect(params.get('redirect') || '/')

    if (ts && Date.now() - ts > MAX_AGE_MS) {
      setError('This sign-in link has expired. Please return to the portal.')
      return
    }

    if (!token) {
      const callback = encodeURIComponent(window.location.origin + redirect)
      window.location.replace(`${LANDING_URL}/login?callback=${callback}`)
      return
    }

    setStatus('Exchanging credentials…')

    fetch(EXCHANGE_FN, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Exchange failed (${res.status})`)
        return data
      })
      .then(async ({ access_token, refresh_token }) => {
        setStatus('Setting up your workspace…')
        const { error: authErr } = await supabase.auth.setSession({ access_token, refresh_token })
        if (authErr) throw new Error(authErr.message)
        window.location.replace(redirect)
      })
      .catch(err => {
        setError(err.message || 'Sign-in failed. Please return to the portal.')
      })
  }, [])

  const s = {
    page:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' },
    card:  { background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '40px 36px', textAlign: 'center', width: 360 },
    icon:  { width: 36, height: 36, borderRadius: 8, background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, margin: '0 auto 20px' },
    title: { color: '#f1f5f9', fontWeight: 600, fontSize: 16 },
    sub:   { color: '#94a3b8', fontSize: 13, marginTop: 8 },
    btn:   { display: 'inline-block', marginTop: 20, padding: '10px 28px', background: '#3b82f6', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' },
  }

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.icon}>SD</div>
          <p style={{ ...s.title, color: '#f87171' }}>Sign-in error</p>
          <p style={s.sub}>{error}</p>
          <a href={LANDING_URL} style={s.btn}>Return to Portal</a>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}>SD</div>
        <p style={s.title}>Stellar Docs</p>
        <p style={s.sub}>{status}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}