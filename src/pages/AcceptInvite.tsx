// src/pages/AcceptInvite.tsx
// Staff member lands here after clicking their invite link
import { useState, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { signUpWithInvite } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function AcceptInvite() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { token?: string }
  const token = search?.token ?? ''

  const [invite, setInvite] = useState<{ email: string; role: string; tenant_name: string } | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [isInvalid, setIsInvalid] = useState(false)

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Validate the invite token on mount
  useEffect(() => {
    if (!token) { setIsInvalid(true); setIsValidating(false); return }

    supabase
      .from('staff_invites')
      .select('email, role, expires_at, accepted_at, tenants(name)')
      .eq('token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data || data.accepted_at || new Date(data.expires_at) < new Date()) {
          setIsInvalid(true)
        } else {
          setInvite({
            email: data.email,
            role: data.role,
            tenant_name: (data.tenants as any)?.name ?? 'your store',
          })
        }
        setIsValidating(false)
      })
  }, [token])

  const handleSubmit = async () => {
    if (!fullName.trim()) { setError('Enter your full name'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setIsLoading(true); setError('')
    try {
      await signUpWithInvite({ token, email: invite!.email, password, fullName })
      navigate({ to: '/dashboard' })
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    border: '1.5px solid #e5e7eb', fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', marginBottom: '14px',
  }

  if (isValidating) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#6b7280' }}>Validating invite...</div>
    </div>
  )

  if (isInvalid) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'system-ui',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '36px', textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '380px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ margin: '0 0 8px', color: '#111827' }}>Invalid Invite</h2>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
          This invite link is invalid, expired, or has already been used.
        </p>
        <button onClick={() => navigate({ to: '/login' })}
          style={{
            background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '10px 24px', fontWeight: '600', cursor: 'pointer',
          }}>
          Go to Login
        </button>
      </div>
    </div>
  )

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
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>👋</div>
          <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800', color: '#111827' }}>
            You're invited!
          </h2>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
            Join <strong>{invite?.tenant_name}</strong> as a{' '}
            <span style={{
              background: '#ede9fe', color: '#7c3aed', padding: '2px 8px',
              borderRadius: '99px', fontSize: '12px', fontWeight: '600',
            }}>
              {invite?.role}
            </span>
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
            Signing up as: <strong style={{ color: '#111827' }}>{invite?.email}</strong>
          </p>
        </div>

        <input placeholder="Your full name" value={fullName}
          onChange={e => setFullName(e.target.value)} style={inputStyle} />
        <input type="password" placeholder="Create a password (min. 8 chars)"
          value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
        <input type="password" placeholder="Confirm password"
          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ ...inputStyle, marginBottom: '20px' }} />

        <button onClick={handleSubmit} disabled={isLoading} style={{
          width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
          background: '#6366f1', color: '#fff', fontWeight: '700', fontSize: '14px',
          cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1,
        }}>
          {isLoading ? 'Setting up your account...' : 'Accept Invite & Join'}
        </button>
      </div>
    </div>
  )
}
