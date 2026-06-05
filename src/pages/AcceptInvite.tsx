// src/pages/AcceptInvite.tsx
// Placeholder — staff invites are not implemented against the current schema.
import { useNavigate } from '@tanstack/react-router'

export default function AcceptInvite() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'system-ui',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '36px', textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: '380px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
        <h2 style={{ margin: '0 0 8px', color: '#111827' }}>Invites unavailable</h2>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
          The staff-invite flow isn't enabled on this workspace yet.
        </p>
        <button
          onClick={() => navigate({ to: '/login' })}
          style={{
            background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '10px 24px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}
