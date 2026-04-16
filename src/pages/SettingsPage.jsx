import { useState } from 'react'
import { Settings, User, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { motion, AnimatePresence } from 'framer-motion'

export default function SettingsPage() {
  const { user, fetchCredits } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    setLoading(true)
    setError('')
    try {
      await api.patch('/api/auth/me', { name, email })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Settings size={16} color="var(--text-3)" />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>Settings</h1>
      </div>

      <div style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <User size={13} color="var(--text-3)" />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            Profile
          </span>
        </div>

        <Field label="Name" value={name} onChange={e => setName(e.target.value)} />
        <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={save}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px',
            background: saved ? 'rgba(57,217,138,0.1)' : 'var(--fire)',
            border: saved ? '1px solid rgba(57,217,138,0.3)' : 'none',
            color: saved ? 'var(--green)' : '#fff',
            borderRadius: 'var(--radius)',
            fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-display)',
            transition: 'all 0.2s',
          }}
        >
          {saved ? <><Check size={13} /> Saved</> : loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* About card */}
      <div style={{
        marginTop: 16,
        padding: '16px',
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>About FireReach</div>
        <p>7-stage deterministic agent workflow with live streaming progress, dual send modes, ICP scoring and OTP-based demo payments.</p>
        <p style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>Stack: FastAPI · React · Three.js · OpenAI</p>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        style={{
          width: '100%', padding: '9px 12px',
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text)',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--fire)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}
