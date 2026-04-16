import { useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Flame, Zap, Play, ChevronDown, RotateCcw, AlertCircle, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import RuntimePanel from '../components/RuntimePanel'
import CompanyCard from '../components/CompanyCard'
import ContactTable from '../components/ContactTable'
import EmailDraft from '../components/EmailDraft'
import CreditsModal from '../components/CreditsModal'
import api from '../api/client'

const STEPS = ['step1','step2','step3','step4','step5','step6','step7']

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: 'var(--text-3)', letterSpacing: '0.08em',
        fontFamily: 'var(--font-mono)',
        marginBottom: 10,
        textTransform: 'uppercase',
      }}>{title}</div>
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const { credits, fetchCredits } = useAuth()
  const [icp, setIcp] = useState('')
  const [mode, setMode] = useState('manual')
  const [testRecipient, setTestRecipient] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showCredits, setShowCredits] = useState(false)

  // Runtime state: idle | running | select_company | done
  const [runtimeState, setRuntimeState] = useState('idle')
  const [stepStatuses, setStepStatuses] = useState({})
  const [currentMessage, setCurrentMessage] = useState('')
  const [error, setError] = useState('')

  // Result data
  const [rankings, setRankings] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [contacts, setContacts] = useState([])
  const [outreach, setOutreach] = useState(null)
  const [historyId, setHistoryId] = useState(null)
  const [sendOutcome, setSendOutcome] = useState(null)

  // Manual select loading
  const [selectLoading, setSelectLoading] = useState(false)

  const abortRef = useRef(null)

  const stepIndex = (s) => parseInt(s.replace('step', '')) - 1

  const reset = () => {
    setRuntimeState('idle')
    setStepStatuses({})
    setCurrentMessage('')
    setError('')
    setRankings([])
    setSelectedCompany(null)
    setContacts([])
    setOutreach(null)
    setHistoryId(null)
    setSendOutcome(null)
  }

  const runCampaign = useCallback(async () => {
    if (!icp.trim()) { setError('Please describe your ICP'); return }
    const cost = mode === 'auto' ? 10 : 5
    if ((credits ?? 0) < cost) { setShowCredits(true); return }

    reset()
    setRuntimeState('running')

    const token = localStorage.getItem('fr_token')
    const backendUrl = import.meta.env.VITE_API_URL || ''
    const resp = await fetch(backendUrl + '/run-agent?stream=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ icp, mode, test_recipient: testRecipient || undefined }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      setError(err.detail || 'Campaign failed to start')
      setRuntimeState('idle')
      return
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line)

          if (event.type === 'step') {
            const idx = stepIndex(event.step)
            setStepStatuses(prev => ({ ...prev, [idx]: event.status }))
            setCurrentMessage(event.message)
          }

          if (event.type === 'result') {
            const d = event.data
            setRankings(d.rankings || [])
            setSendOutcome(d.send_outcome)

            if (mode === 'auto') {
              setSelectedCompany(d.selected_company || null)
              setContacts(d.contacts || [])
              setOutreach(d.outreach || null)
              setRuntimeState('done')
            } else {
              setRuntimeState('select_company')
            }

            // Mark all done
            setStepStatuses(s => {
              const copy = { ...s }
              STEPS.forEach((_, i) => { if (copy[i] !== 'error') copy[i] = 'done' })
              return copy
            })
            setCurrentMessage('Pipeline complete.')
            await fetchCredits()
          }

          if (event.type === 'history_saved') {
            setHistoryId(event.history_id)
          }

          if (event.type === 'error') {
            setError(event.message || 'Agent error')
            setRuntimeState('idle')
          }
        } catch {/* skip malformed line */}
      }
    }
  }, [icp, mode, testRecipient, credits, fetchCredits])

  const selectCompany = async (company) => {
    setSelectLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/select-company', { icp, company })
      setSelectedCompany(data.company)
      setContacts(data.contacts || [])
      setOutreach(data.outreach || null)
      setRuntimeState('done')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load company details')
    } finally {
      setSelectLoading(false)
    }
  }

  const costBadge = mode === 'auto' ? 10 : 5

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      gap: 0,
      overflow: 'hidden',
    }}>
      {/* Left Panel — Input */}
      <div style={{
        width: 340,
        borderRight: '1px solid var(--border)',
        padding: '24px 20px',
        overflowY: 'auto',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Flame size={16} color="var(--fire)" />
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>
              New Campaign
            </h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Describe your ideal customer profile and let the 7-agent pipeline find and reach your best opportunities.
          </p>
        </div>

        {/* ICP input */}
        <Section title="ICP Description">
          <textarea
            value={icp}
            onChange={e => setIcp(e.target.value)}
            placeholder="e.g. We sell cybersecurity training to Series B startups in the US with 50-200 employees"
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: 12,
              lineHeight: 1.6,
              color: 'var(--text)',
              resize: 'vertical',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--fire)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </Section>

        {/* Mode toggle */}
        <Section title="Send Mode">
          <div style={{
            display: 'flex',
            background: 'var(--bg)',
            borderRadius: 'var(--radius)',
            padding: 3,
            border: '1px solid var(--border)',
          }}>
            {[
              { id: 'manual', label: 'Manual', desc: '5 credits', sublabel: 'Review & select' },
              { id: 'auto', label: 'Auto', desc: '10 credits', sublabel: 'Full autopilot' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  borderRadius: 4,
                  background: mode === m.id ? 'var(--bg-2)' : 'transparent',
                  border: mode === m.id ? '1px solid var(--border)' : '1px solid transparent',
                  transition: 'all 0.15s',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: mode === m.id ? 'var(--text)' : 'var(--text-3)' }}>
                  {m.label}
                  {m.id === 'auto' && (
                    <span style={{ marginLeft: 4, fontSize: 9, color: 'var(--fire)', background: 'rgba(255,92,26,0.12)', padding: '1px 4px', borderRadius: 3 }}>AI</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                  {m.desc} · {m.sublabel}
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Advanced */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'var(--text-3)', fontSize: 11, background: 'none',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <ChevronDown
              size={12}
              style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
            Advanced options
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ paddingTop: 12 }}>
                  <label style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Test Recipient Email (override send-to)
                  </label>
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={e => setTestRecipient(e.target.value)}
                    placeholder="test@yourdomain.com"
                    style={{
                      width: '100%', padding: '7px 10px',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', fontSize: 12,
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Credits info */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          marginBottom: 16,
          fontSize: 11,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            <Zap size={11} color="var(--yellow)" />
            Cost: <strong style={{ color: 'var(--text)' }}>{costBadge}</strong> credits
          </div>
          <div style={{ color: (credits ?? 0) < costBadge ? 'var(--red)' : 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
            Balance: <strong>{credits ?? 0}</strong>
            {(credits ?? 0) < costBadge && (
              <button
                onClick={() => setShowCredits(true)}
                style={{ marginLeft: 8, color: 'var(--fire)', fontSize: 10, background: 'none', textDecoration: 'underline' }}
              >
                Top up
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 12px', marginBottom: 14,
                background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)',
                borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: 12,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Run button */}
        {runtimeState === 'idle' ? (
          <button
            onClick={runCampaign}
            disabled={!icp.trim()}
            style={{
              width: '100%',
              padding: '12px 0',
              background: icp.trim() ? 'var(--fire)' : 'var(--bg-2)',
              color: icp.trim() ? '#fff' : 'var(--text-3)',
              borderRadius: 'var(--radius)',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: icp.trim() ? '0 0 20px rgba(255,92,26,0.25)' : 'none',
              transition: 'all 0.2s',
              letterSpacing: '0.01em',
            }}
          >
            <Play size={14} />
            Launch Campaign
          </button>
        ) : (runtimeState === 'running' || runtimeState === 'select_company' || runtimeState === 'done') && (
          <button
            onClick={reset}
            style={{
              width: '100%', padding: '10px 0',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <RotateCcw size={13} />
            New Campaign
          </button>
        )}

        {/* Credits button */}
        <button
          onClick={() => setShowCredits(true)}
          style={{
            width: '100%', marginTop: 10, padding: '8px 0',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Zap size={12} color="var(--yellow)" />
          Buy Credits
        </button>
      </div>

      {/* Right Panel — Runtime + Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px' }}>
        {runtimeState === 'idle' && (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-3)', textAlign: 'center',
          }}>
            <div style={{
              width: 72, height: 72,
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Flame size={28} color="var(--fire)" style={{ opacity: 0.4 }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Ready to fire</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 280 }}>
              Enter your ICP on the left and launch a campaign. The 7-agent pipeline will stream live progress here.
            </p>
          </div>
        )}

        {(runtimeState === 'running' || runtimeState === 'select_company' || runtimeState === 'done') && (
          <div style={{ maxWidth: 720 }}>
            {/* 3D Runtime panel */}
            <div style={{ marginBottom: 24 }}>
              <RuntimePanel
                stepStatuses={STEPS.map((_, i) => stepStatuses[i] || 'pending')}
                currentMessage={currentMessage}
              />
            </div>

            {/* Running spinner */}
            {runtimeState === 'running' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fire)', fontSize: 13, marginBottom: 20 }}>
                <div className="animate-spin" style={{ width: 14, height: 14, border: '2px solid var(--fire)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                Pipeline executing…
              </div>
            )}

            {/* Rankings */}
            {rankings.length > 0 && (
              <Section title={`Ranked Opportunities — ${rankings.length} companies`}>
                {runtimeState === 'select_company' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', marginBottom: 12,
                    background: 'rgba(59,158,255,0.08)', border: '1px solid rgba(59,158,255,0.2)',
                    borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--blue)',
                  }}>
                    <Info size={13} />
                    Select a company below to generate contacts and outreach draft.
                    {selectLoading && <span style={{ marginLeft: 8 }}>Loading…</span>}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rankings.map((co, i) => (
                    <CompanyCard
                      key={co.name}
                      company={co}
                      rank={i}
                      isTop={i === 0}
                      onSelect={runtimeState === 'select_company' ? selectCompany : null}
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* Done results */}
            {runtimeState === 'done' && selectedCompany && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Auto mode send status */}
                {mode === 'auto' && sendOutcome && (
                  <div style={{
                    padding: '10px 14px', marginBottom: 16,
                    background: sendOutcome === 'sent' ? 'rgba(57,217,138,0.08)' : 'rgba(255,92,26,0.06)',
                    border: `1px solid ${sendOutcome === 'sent' ? 'rgba(57,217,138,0.25)' : 'rgba(255,92,26,0.2)'}`,
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                    color: sendOutcome === 'sent' ? 'var(--green)' : 'var(--fire)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    AUTO SEND: {sendOutcome.toUpperCase()}
                  </div>
                )}

                {/* Contacts */}
                <Section title="Contact Discovery">
                  <ContactTable contacts={contacts} />
                </Section>

                {/* Email draft */}
                {outreach && (
                  <Section title="Outreach Email">
                    <EmailDraft
                      outreach={outreach}
                      toEmail={contacts[0]?.email || ''}
                      historyId={historyId}
                    />
                  </Section>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Credits Modal */}
      <AnimatePresence>
        {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
      </AnimatePresence>
    </div>
  )
}
