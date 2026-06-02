// src/pages/Onboarding.tsx
// Multi-step business signup flow for PosifyPro
// Steps: 1. Account  2. Business Info  3. Preferences  4. Done

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { signUpAsOwner } from '@/lib/auth'

// -------------------------------------------------------
// Types
// -------------------------------------------------------
interface FormData {
  // Step 1 - Account
  fullName: string
  email: string
  password: string
  confirmPassword: string
  // Step 2 - Business
  businessName: string
  phone: string
  address: string
  // Step 3 - Preferences
  currency: string
  timezone: string
  plan: 'free' | 'basic' | 'pro'
}

const CURRENCIES = [
  { code: 'KES', label: 'Kenyan Shilling (KES)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'UGX', label: 'Ugandan Shilling (UGX)' },
  { code: 'TZS', label: 'Tanzanian Shilling (TZS)' },
  { code: 'NGN', label: 'Nigerian Naira (NGN)' },
  { code: 'GHS', label: 'Ghanaian Cedi (GHS)' },
  { code: 'ZAR', label: 'South African Rand (ZAR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'EUR', label: 'Euro (EUR)' },
]

const TIMEZONES = [
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
  { value: 'Africa/Accra', label: 'Accra (GMT)' },
  { value: 'Africa/Cairo', label: 'Cairo (EET)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
]

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 'KES 0/mo',
    features: ['1 cashier', 'Up to 50 products', 'Basic sales reports', 'Email support'],
    color: '#6b7280',
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 'KES 999/mo',
    features: ['5 cashiers', 'Unlimited products', 'Advanced reports', 'M-Pesa integration', 'Priority support'],
    color: '#3b82f6',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'KES 2,499/mo',
    features: ['Unlimited cashiers', 'Multi-branch support', 'Custom receipts', 'API access', 'Dedicated support'],
    color: '#8b5cf6',
  },
]

// -------------------------------------------------------
// Step Indicator
// -------------------------------------------------------
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: i < current ? '32px' : '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.3s',
            background: i + 1 < current ? '#10b981' : i + 1 === current ? '#6366f1' : '#e5e7eb',
            color: i + 1 <= current ? '#fff' : '#9ca3af',
          }}>
            {i + 1 < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{
              width: '40px', height: '2px',
              background: i + 1 < current ? '#10b981' : '#e5e7eb',
              transition: 'all 0.3s',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// -------------------------------------------------------
// Input Component
// -------------------------------------------------------
function Input({
  label, type = 'text', value, onChange, placeholder, required, error
}: {
  label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder?: string
  required?: boolean; error?: string
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: '8px',
          border: error ? '1.5px solid #ef4444' : '1.5px solid #e5e7eb',
          fontSize: '14px', outline: 'none', boxSizing: 'border-box',
          background: '#fff', color: '#111827',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = error ? '#ef4444' : '#e5e7eb'}
      />
      {error && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{error}</p>}
    </div>
  )
}

// -------------------------------------------------------
// Select Component
// -------------------------------------------------------
function Select({ label, value, onChange, options }: {
  label: string; value: string
  onChange: (v: string) => void
  options: { value?: string; code?: string; label: string }[]
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: '8px',
          border: '1.5px solid #e5e7eb', fontSize: '14px',
          outline: 'none', background: '#fff', color: '#111827',
          boxSizing: 'border-box',
        }}
      >
        {options.map(o => (
          <option key={o.value ?? o.code} value={o.value ?? o.code}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// -------------------------------------------------------
// Main Onboarding Component
// -------------------------------------------------------
export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const [form, setForm] = useState<FormData>({
    fullName: '', email: '', password: '', confirmPassword: '',
    businessName: '', phone: '', address: '',
    currency: 'KES', timezone: 'Africa/Nairobi', plan: 'basic',
  })

  const update = (key: keyof FormData) => (value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    setFieldErrors(e => ({ ...e, [key]: '' }))
  }

  // -------------------------------------------------------
  // Validation
  // -------------------------------------------------------
  const validateStep1 = () => {
    const errors: Partial<Record<keyof FormData, string>> = {}
    if (!form.fullName.trim()) errors.fullName = 'Full name is required'
    if (!form.email.trim()) errors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Enter a valid email'
    if (!form.password) errors.password = 'Password is required'
    else if (form.password.length < 8) errors.password = 'At least 8 characters'
    if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep2 = () => {
    const errors: Partial<Record<keyof FormData, string>> = {}
    if (!form.businessName.trim()) errors.businessName = 'Business name is required'
    if (!form.phone.trim()) errors.phone = 'Phone number is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // -------------------------------------------------------
  // Navigation
  // -------------------------------------------------------
  const next = () => {
    setError('')
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(s => s + 1)
  }

  const back = () => setStep(s => s - 1)

  // -------------------------------------------------------
  // Submit
  // -------------------------------------------------------
  const handleSubmit = async () => {
    setIsLoading(true)
    setError('')
    try {
      await signUpAsOwner({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        businessName: form.businessName,
        phone: form.phone,
        currency: form.currency,
      })
      setStep(4) // Success step
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // -------------------------------------------------------
  // Styles
  // -------------------------------------------------------
  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '480px',
    margin: '0 auto',
  }

  const btnStyle = (primary = true): React.CSSProperties => ({
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '600',
    fontSize: '14px',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    background: primary ? '#6366f1' : '#f3f4f6',
    color: primary ? '#fff' : '#374151',
    opacity: isLoading ? 0.7 : 1,
    transition: 'all 0.2s',
    flex: 1,
  })

  // -------------------------------------------------------
  // Render Steps
  // -------------------------------------------------------
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f0ff 0%, #faf5ff 50%, #eff6ff 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          background: '#6366f1', borderRadius: '12px',
          padding: '10px 20px', marginBottom: '8px',
        }}>
          <span style={{ fontSize: '20px' }}>🏪</span>
          <span style={{ color: '#fff', fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px' }}>
            PosifyPro
          </span>
        </div>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
          The smart POS for modern businesses
        </p>
      </div>

      <div style={cardStyle}>
        {/* Step 1 — Account */}
        {step === 1 && (
          <>
            <StepIndicator current={1} total={3} />
            <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#111827' }}>
              Create your account
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              You'll be the owner and admin of your store.
            </p>
            <Input label="Full Name" value={form.fullName} onChange={update('fullName')}
              placeholder="Jane Wanjiru" required error={fieldErrors.fullName} />
            <Input label="Email Address" type="email" value={form.email} onChange={update('email')}
              placeholder="jane@mybusiness.com" required error={fieldErrors.email} />
            <Input label="Password" type="password" value={form.password} onChange={update('password')}
              placeholder="Min. 8 characters" required error={fieldErrors.password} />
            <Input label="Confirm Password" type="password" value={form.confirmPassword}
              onChange={update('confirmPassword')} placeholder="Repeat password"
              required error={fieldErrors.confirmPassword} />
            <button onClick={next} style={{ ...btnStyle(), width: '100%', marginTop: '8px' }}>
              Continue →
            </button>
            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#6b7280' }}>
              Already have an account?{' '}
              <span onClick={() => navigate({ to: '/login' })}
                style={{ color: '#6366f1', cursor: 'pointer', fontWeight: '600' }}>
                Sign in
              </span>
            </p>
          </>
        )}

        {/* Step 2 — Business Info */}
        {step === 2 && (
          <>
            <StepIndicator current={2} total={3} />
            <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#111827' }}>
              Tell us about your business
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              This will appear on your receipts and dashboard.
            </p>
            <Input label="Business Name" value={form.businessName} onChange={update('businessName')}
              placeholder="e.g. Mama's Bakery" required error={fieldErrors.businessName} />
            <Input label="Phone Number" value={form.phone} onChange={update('phone')}
              placeholder="+254 700 000 000" required error={fieldErrors.phone} />
            <Input label="Address (optional)" value={form.address} onChange={update('address')}
              placeholder="e.g. Tom Mboya St, Nairobi" />
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button onClick={back} style={btnStyle(false)}>← Back</button>
              <button onClick={next} style={btnStyle()}>Continue →</button>
            </div>
          </>
        )}

        {/* Step 3 — Preferences & Plan */}
        {step === 3 && (
          <>
            <StepIndicator current={3} total={3} />
            <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#111827' }}>
              Choose your plan
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
              Start free, upgrade anytime.
            </p>

            {/* Plan selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {PLANS.map(plan => (
                <div key={plan.id}
                  onClick={() => update('plan')(plan.id)}
                  style={{
                    border: form.plan === plan.id ? `2px solid ${plan.color}` : '2px solid #e5e7eb',
                    borderRadius: '10px', padding: '14px 16px', cursor: 'pointer',
                    background: form.plan === plan.id ? `${plan.color}08` : '#fff',
                    transition: 'all 0.2s', position: 'relative',
                  }}>
                  {plan.popular && (
                    <span style={{
                      position: 'absolute', top: '-10px', right: '12px',
                      background: plan.color, color: '#fff', fontSize: '10px',
                      fontWeight: '700', padding: '2px 8px', borderRadius: '99px',
                    }}>POPULAR</span>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: '#111827', fontSize: '15px' }}>{plan.name}</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {plan.features.map(f => (
                          <span key={f} style={{ fontSize: '11px', color: '#6b7280' }}>✓ {f}</span>
                        ))}
                      </div>
                    </div>
                    <span style={{ fontWeight: '800', color: plan.color, fontSize: '13px', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                      {plan.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Select label="Currency" value={form.currency} onChange={update('currency')} options={CURRENCIES} />
            <Select label="Timezone" value={form.timezone} onChange={update('timezone')}
              options={TIMEZONES.map(t => ({ value: t.value, label: t.label }))} />

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '12px', marginBottom: '16px',
                color: '#dc2626', fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={back} style={btnStyle(false)}>← Back</button>
              <button onClick={handleSubmit} disabled={isLoading} style={btnStyle()}>
                {isLoading ? 'Setting up...' : '🚀 Launch my store'}
              </button>
            </div>
          </>
        )}

        {/* Step 4 — Success */}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '800', color: '#111827' }}>
              You're all set!
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
              <strong>{form.businessName}</strong> is now live on PosifyPro.
            </p>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '32px' }}>
              Check your email to verify your account, then log in to your dashboard.
            </p>
            <button
              onClick={() => navigate({ to: '/dashboard' })}
              style={{ ...btnStyle(), width: '100%', padding: '14px' }}
            >
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>

      <p style={{ marginTop: '20px', fontSize: '12px', color: '#9ca3af' }}>
        © 2026 PosifyPro · Privacy · Terms
      </p>
    </div>
  )
}
