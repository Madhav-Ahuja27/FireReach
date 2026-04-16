import { Mail, Linkedin, User } from 'lucide-react'

export default function ContactTable({ contacts, onSelectContact, selectedEmail }) {
  if (!contacts?.length) return null

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <User size={13} color="var(--text-3)" />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
          CONTACTS — {contacts.length} found
        </span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg)' }}>
            {['Name', 'Title', 'Email', ''].map(h => (
              <th key={h} style={{
                padding: '8px 14px',
                textAlign: 'left',
                fontSize: 10,
                color: 'var(--text-3)',
                fontWeight: 600,
                letterSpacing: '0.06em',
                fontFamily: 'var(--font-mono)',
                borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contacts.map((c, i) => {
            const isSelected = selectedEmail && c.email === selectedEmail
            return (
              <tr
                key={i}
                style={{
                  background: isSelected ? 'rgba(255,92,26,0.06)' : 'transparent',
                  borderBottom: i < contacts.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: onSelectContact ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
                onClick={() => onSelectContact?.(c)}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(255,92,26,0.06)' : 'transparent' }}
              >
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>
                  {c.name}
                  {isSelected && <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--fire)', fontFamily: 'var(--font-mono)' }}>SELECTED</span>}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-2)' }}>{c.title}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--blue)' }}>
                  {c.email}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {c.email && (
                      <a href={`mailto:${c.email}`} style={{ color: 'var(--text-3)', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                        onClick={e => e.stopPropagation()}
                      >
                        <Mail size={13} />
                      </a>
                    )}
                    {c.linkedin && (
                      <a href={c.linkedin} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--text-3)', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                        onClick={e => e.stopPropagation()}
                      >
                        <Linkedin size={13} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
