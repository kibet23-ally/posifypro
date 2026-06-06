// src/pages/Login.tsx
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { signIn, resetPassword } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return }
    setIsLoading(true); setError('')
    try {
      const { user } = await signIn(email, password)
      // Route super admins to the super-admin dashboard
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.role === 'super_admin') {
        navigate({ to: '/admin' })
      } else {
        navigate({ to: '/dashboard' })
      }
    } catch (err: any) {
      setError(err.message ?? 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    if (!email) { setError('Enter your email address'); return }
    setIsLoading(true); setError('')
    try {
      await resetPassword(email)
      setResetSent(true)
    } catch (err: any) {
      setError(err.message ?? 'Could not send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    border: '1.5px solid #e5e7eb', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', background: '#fff',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f0ff 0%, #faf5ff 50%, #eff6ff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '36px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: '#6366f1', borderRadius: '10px', padding: '8px 16px', marginBottom: '8px',
          }}>
            <span style={{ fontSize: '18px' }}>🏪</span>
            <span style={{ color: '#fff', fontWeight: '800', fontSize: '16px' }}>PosifyPro</span>
          </div>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
            {mode === 'login' ? 'Sign in to your store' : 'Reset your password'}
          </p>
        </div>

        {/* Reset sent confirmation */}
        {resetSent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📧</div>
            <h3 style={{ margin: '0 0 8px', color: '#111827' }}>Check your email</h3>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '24px' }}>
              We sent a password reset link to <strong>{email}</strong>
            </p>
            <button onClick={() => { setMode('login'); setResetSent(false) }}
              style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
              Back to login
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
                padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Email Address
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="jane@mybusiness.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>

            {mode === 'login' && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Password</label>
                  <span onClick={() => { setMode('reset'); setError('') }}
                    style={{ fontSize: '12px', color: '#6366f1', cursor: 'pointer', fontWeight: '600' }}>
                    Forgot password?
                  </span>
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Your password" style={inputStyle}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
            )}

            <button
              onClick={mode === 'login' ? handleLogin : handleReset}
              disabled={isLoading}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                background: '#6366f1', color: '#fff', fontWeight: '700', fontSize: '14px',
                cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1,
              }}>
              {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Send Reset Link'}
            </button>

            {mode === 'reset' && (
              <button onClick={() => { setMode('login'); setError('') }}
                style={{
                  width: '100%', marginTop: '10px', padding: '10px', borderRadius: '8px',
                  border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151',
                  fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                }}>
                ← Back to login
              </button>
            )}

            {mode === 'login' && (
              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#6b7280' }}>
                New business?{' '}
                <span onClick={() => navigate({ to: '/onboarding' })}
                  style={{ color: '#6366f1', cursor: 'pointer', fontWeight: '600' }}>
                  Create a free account
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
