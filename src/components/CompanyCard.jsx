import { motion } from 'framer-motion'
import ScoreRing from './ScoreRing'
import { TrendingUp, Users, Tag, ChevronRight } from 'lucide-react'

export default function CompanyCard({ company, rank, onSelect, isTop }) {
  const { name, domain, brief, avg_score, signal_score, icp_score, signal_categories = [], verified_signals = [] } = company

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.06 }}
      style={{
        background: isTop ? 'linear-gradient(135deg, rgba(255,92,26,0.06), rgba(255,92,26,0.02))' : 'var(--bg-1)',
        border: `1px solid ${isTop ? 'rgba(255,92,26,0.3)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'border-color 0.15s, transform 0.15s',
        position: 'relative',
      }}
      whileHover={onSelect ? { scale: 1.005 } : {}}
      onClick={() => onSelect?.(company)}
    >
      {isTop && (
        <div style={{
          position: 'absolute', top: -1, left: 16,
          background: 'var(--fire)',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '0 0 4px 4px',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-mono)',
        }}>
          #1 RANKED
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginTop: isTop ? 8 : 0 }}>
        <ScoreRing score={avg_score ?? 0} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 15,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {name}
            </span>
            {domain && (
              <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {domain}
              </span>
            )}
          </div>

          {brief && (
            <p style={{
              fontSize: 12,
              color: 'var(--text-2)',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: 8,
            }}>
              {brief}
            </p>
          )}

          {/* Sub-scores */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <ScorePill icon={<TrendingUp size={10} />} label="Signal" value={signal_score} />
            <ScorePill icon={<Tag size={10} />} label="ICP" value={icp_score} />
          </div>

          {/* Signal tags */}
          {signal_categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {signal_categories.slice(0, 4).map(cat => (
                <span key={cat} style={{
                  fontSize: 10,
                  padding: '2px 7px',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  color: 'var(--text-2)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'capitalize',
                }}>
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {onSelect && (
          <div style={{ color: 'var(--text-3)', flexShrink: 0 }}>
            <ChevronRight size={16} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

function ScorePill({ icon, label, value }) {
  const color = value >= 70 ? 'var(--green)' : value >= 40 ? 'var(--yellow)' : 'var(--text-3)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)' }}>
      {icon}
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  )
}
