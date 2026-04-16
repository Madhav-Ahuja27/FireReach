import { useState } from 'react'
import { Mail, Send, Edit3, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../api/client'

export default function EmailDraft({ outreach, toEmail, historyId, onSent }) {
  const [subject, setSubject] = useState(outreach?.subject || '')
  const [body, setBody] = useState(outreach?.body || '')
  const [to, setTo] = useState(toEmail || '')
  const [editing, setEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    if (!to) { setError('Recipient email required'); return }
    setSending(true)
    setError('')
    try {
      await api.post('/send-email', { to_email: to, subject, body, history_id: historyId })
      setSent(true)
      onSent?.()
    } catch (err) {
      setError(err.response?.data?.detail || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={13} color="var(--fire)" />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            OUTREACH DRAFT
          </span>
        </div>
        {!sent && (
          <button
            onClick={() => setEditing(!editing)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px',
              background: editing ? 'rgba(255,92,26,0.1)' : 'var(--bg-2)',
              border: `1px solid ${editing ? 'rgba(255,92,26,0.3)' : 'var(--border)'}`,
              borderRadius: 4,
              fontSize: 11, color: editing ? 'var(--fire)' : 'var(--text-3)',
            }}
          >
            <Edit3 size={11} />
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        {/* To field */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>TO</label>
          <input
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@company.com"
            style={{
              width: '100%',
              padding: '7px 10px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: 12,
              color: 'var(--blue)',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        {/* Subject */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>SUBJECT</label>
          {editing ? (
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text)',
              }}
            />
          ) : (
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', padding: '7px 0' }}>{subject}</div>
          )}
        </div>

        {/* Body */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>BODY</label>
          {editing ? (
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              style={{
                width: '100%', padding: '10px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', fontSize: 12, lineHeight: 1.7,
                color: 'var(--text)', resize: 'vertical',
              }}
            />
          ) : (
            <div style={{
              fontSize: 12, lineHeight: 1.7,
              color: 'var(--text-2)',
              background: 'var(--bg)',
              padding: '12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              whiteSpace: 'pre-wrap',
              maxHeight: 220,
              overflowY: 'auto',
            }}>
              {body}
            </div>
          )}
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>
        )}

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px',
              background: 'rgba(57,217,138,0.08)',
              border: '1px solid rgba(57,217,138,0.25)',
              borderRadius: 'var(--radius)',
              color: 'var(--green)',
              fontSize: 13,
            }}
          >
            <Check size={15} />
            Email sent successfully!
          </motion.div>
        ) : (
          <button
            onClick={send}
            disabled={sending}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px',
              background: sending ? 'var(--bg-2)' : 'var(--fire)',
              color: sending ? 'var(--text-3)' : '#fff',
              borderRadius: 'var(--radius)',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-display)',
              transition: 'all 0.15s',
            }}
          >
            <Send size={13} />
            {sending ? 'Sending…' : 'Send Email'}
          </button>
        )}
      </div>
    </div>
  )
}
