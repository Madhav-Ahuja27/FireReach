import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, CreditCard, Check, AlertCircle } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const PLANS = [
  { id: 'STARTER',    price: '$9',   credits: 50,   label: 'Starter' },
  { id: 'GROWTH',     price: '$29',  credits: 200,  label: 'Growth',  popular: true },
  { id: 'SCALE',      price: '$79',  credits: 600,  label: 'Scale' },
  { id: 'PRO',        price: '$149', credits: 1500, label: 'Pro' },
  { id: 'ENTERPRISE', price: '$299', credits: 5000, label: 'Enterprise' },
]

export default function CreditsModal({ onClose }) {
  const { fetchCredits } = useAuth()
  const [step, setStep] = useState('plans')          // plans → checkout → otp → done
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [phone, setPhone] = useState('')
  const [paymentId, setPaymentId] = useState(null)
  const [debugOtp, setDebugOtp] = useState(null)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const initCheckout = async (plan) => {
    setSelectedPlan(plan)
    setStep('checkout')
  }

  const createPayment = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/payments/demo/create', {
        plan: selectedPlan.id,
        phone: phone || undefined,
      })
      setPaymentId(data.payment_id)
      setDebugOtp(data.debug_otp)
      setStep('otp')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initiate payment')
    } finally {
      setLoading(false)
    }
  }

  const submitOtp = async () => {
    if (!otp.trim()) { setError('Enter your OTP'); return }
    setLoading(true)
    setError('')
    try {
      await api.post(`/api/payments/demo/${paymentId}/submit`, { otp })
      await fetchCredits()
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      padding: 20,
      backdropFilter: 'blur(4px)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          width: '100%',
          maxWidth: step === 'plans' ? 560 : 380,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 4, padding: 4, color: 'var(--text-3)',
          }}
        >
          <X size={14} />
        </button>

        {step === 'plans' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Zap size={16} color="var(--yellow)" />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Top up credits</h2>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-2)' }}>Manual: 5 credits · Auto: 10 credits per campaign</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PLANS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => initCheckout(plan)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: plan.popular ? 'rgba(255,92,26,0.06)' : 'var(--bg)',
                    border: `1px solid ${plan.popular ? 'rgba(255,92,26,0.3)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--fire)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = plan.popular ? 'rgba(255,92,26,0.3)' : 'var(--border)'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-display)' }}>{plan.label}</span>
                      {plan.popular && (
                        <span style={{
                          fontSize: 9, padding: '1px 6px',
                          background: 'var(--fire)', color: '#fff',
                          borderRadius: 3, fontWeight: 700, letterSpacing: '0.05em',
                        }}>POPULAR</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {plan.credits.toLocaleString()} credits
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--fire)' }}>
                    {plan.price}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'checkout' && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
              Checkout — {selectedPlan?.label}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20 }}>
              {selectedPlan?.credits.toLocaleString()} credits for {selectedPlan?.price}
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Phone (optional, for SMS OTP)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', fontSize: 13,
                }}
              />
            </div>

            {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('plans')} style={{ flex: 1, padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-2)' }}>
                Back
              </button>
              <button
                onClick={createPayment}
                disabled={loading}
                style={{
                  flex: 2, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'var(--fire)', color: '#fff',
                  borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                }}
              >
                <CreditCard size={14} />
                {loading ? 'Processing…' : 'Continue to OTP'}
              </button>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Verify Payment</h2>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20 }}>
              Enter the 6-digit code {phone ? `sent to ${phone}` : 'below (debug mode)'}
            </p>

            {debugOtp && (
              <div style={{
                padding: '10px 14px', marginBottom: 16,
                background: 'rgba(57,217,138,0.08)',
                border: '1px solid rgba(57,217,138,0.2)',
                borderRadius: 'var(--radius)',
                fontSize: 12, color: 'var(--green)',
                fontFamily: 'var(--font-mono)',
              }}>
                Debug OTP: <strong style={{ fontSize: 16, letterSpacing: '0.2em' }}>{debugOtp}</strong>
              </div>
            )}

            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={{
                width: '100%', padding: '12px', textAlign: 'center',
                fontSize: 24, letterSpacing: '0.3em', fontFamily: 'var(--font-mono)',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', color: 'var(--text)',
                marginBottom: 16,
              }}
            />

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>
                <AlertCircle size={13} />{error}
              </div>
            )}

            <button
              onClick={submitOtp}
              disabled={loading || otp.length < 6}
              style={{
                width: '100%', padding: '11px', fontFamily: 'var(--font-display)',
                background: otp.length < 6 ? 'var(--bg-2)' : 'var(--fire)',
                color: otp.length < 6 ? 'var(--text-3)' : '#fff',
                borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600,
              }}
            >
              {loading ? 'Verifying…' : 'Confirm Payment'}
            </button>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: 56, height: 56,
              background: 'rgba(57,217,138,0.1)',
              border: '2px solid var(--green)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Check size={24} color="var(--green)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Credits added!</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
              {selectedPlan?.credits.toLocaleString()} credits are now in your account.
            </p>
            <button onClick={onClose} style={{ padding: '10px 24px', background: 'var(--fire)', color: '#fff', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600 }}>
              Done
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
