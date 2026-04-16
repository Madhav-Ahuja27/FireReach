import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronDown, Trash2, Building2, Mail, Zap } from 'lucide-react'
import api from '../api/client'
import ScoreRing from '../components/ScoreRing'

export default function HistoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.get('/api/history').then(r => setItems(r.data)).finally(() => setLoading(false))
  }, [])

  const remove = async (id, e) => {
    e.stopPropagation()
    await api.delete(`/api/history/${id}`)
    setItems(prev => prev.filter(h => h.id !== id))
    if (expanded === id) setExpanded(null)
  }

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ padding: '24px', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Clock size={16} color="var(--text-3)" />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>Campaign History</h1>
        <span style={{
          fontSize: 11, padding: '2px 8px',
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
        }}>
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <Clock size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>No campaigns yet. Launch one from the dashboard.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, i) => {
            const result = item.result || {}
            const topCompany = result.selected_company || result.rankings?.[0]
            const summary = result.summary || {}
            const isOpen = expanded === item.id

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }}
              >
                {/* Row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  style={{
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ChevronDown
                    size={13}
                    color="var(--text-3)"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                      {item.icp}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      <span style={{
                        padding: '0 6px',
                        background: item.mode === 'auto' ? 'rgba(255,92,26,0.12)' : 'var(--bg-2)',
                        borderRadius: 3,
                        color: item.mode === 'auto' ? 'var(--fire)' : 'var(--text-3)',
                      }}>
                        {item.mode.toUpperCase()}
                      </span>
                      {summary.top_company && (
                        <span>→ {summary.top_company}</span>
                      )}
                    </div>
                  </div>

                  {topCompany && (
                    <ScoreRing score={topCompany.avg_score || topCompany.final_score || 0} size={36} stroke={3} />
                  )}

                  <button
                    onClick={e => remove(item.id, e)}
                    style={{ color: 'var(--text-3)', padding: 4, background: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                        {/* Rankings summary */}
                        {result.rankings?.length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              <Building2 size={10} style={{ marginRight: 4 }} />
                              Top Companies
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {result.rankings.slice(0, 3).map((co, ci) => (
                                <div key={ci} style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '8px 12px',
                                  background: 'var(--bg)',
                                  borderRadius: 'var(--radius)',
                                  border: '1px solid var(--border)',
                                }}>
                                  <ScoreRing score={co.avg_score || 0} size={32} stroke={3} />
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>{co.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{co.domain}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Outreach preview */}
                        {result.outreach && (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              <Mail size={10} style={{ marginRight: 4 }} />
                              Outreach
                            </div>
                            <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12 }}>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>{result.outreach.subject}</div>
                              <div style={{ color: 'var(--text-2)', fontSize: 11, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {result.outreach.body}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Send status */}
                        {result.send_outcome && (
                          <div style={{ marginTop: 10, fontSize: 11, fontFamily: 'var(--font-mono)', color: result.send_outcome === 'sent' ? 'var(--green)' : 'var(--text-3)' }}>
                            SEND: {result.send_outcome.toUpperCase()}
                            {result.send_to && ` → ${result.send_to}`}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
