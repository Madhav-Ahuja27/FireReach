import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

const STEP_COLORS = {
  pending: '#2a2a32',
  'in-progress': '#ff5c1a',
  done: '#39d98a',
  error: '#ff4d4d',
}

const STEP_LABELS = [
  'Discovery',
  'Signals',
  'Verify',
  'Brief',
  'Score',
  'Contacts',
  'Outreach',
]

function Node({ position, status, index, total }) {
  const meshRef = useRef()
  const ringRef = useRef()
  const color = STEP_COLORS[status] || STEP_COLORS.pending

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    if (status === 'in-progress') {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.08)
      if (ringRef.current) {
        ringRef.current.rotation.z = t * 2
        ringRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.12)
      }
    } else if (status === 'done') {
      meshRef.current.scale.setScalar(1)
    } else {
      meshRef.current.scale.setScalar(0.85)
    }
  })

  return (
    <group position={position}>
      {/* Outer ring for in-progress */}
      {status === 'in-progress' && (
        <mesh ref={ringRef}>
          <torusGeometry args={[0.28, 0.03, 8, 32]} />
          <meshBasicMaterial color="#ff5c1a" transparent opacity={0.4} />
        </mesh>
      )}

      {/* Main node sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.18, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={status === 'in-progress' ? 0.8 : status === 'done' ? 0.4 : 0.05}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>
    </group>
  )
}

function Pipeline({ stepStatuses }) {
  const total = 7
  const spacing = 1.6
  const startX = -((total - 1) * spacing) / 2

  const points = useMemo(() => {
    return Array.from({ length: total }, (_, i) => [startX + i * spacing, 0, 0])
  }, [startX, spacing, total])

  return (
    <group>
      {/* Connecting lines */}
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1]
        const isDone = stepStatuses[i] === 'done' && (stepStatuses[i + 1] === 'done' || stepStatuses[i + 1] === 'in-progress')
        return (
          <Line
            key={i}
            points={[p, next]}
            color={isDone ? '#39d98a' : '#2a2a32'}
            lineWidth={isDone ? 2 : 1}
          />
        )
      })}

      {/* Nodes */}
      {points.map((pos, i) => (
        <Node
          key={i}
          position={pos}
          status={stepStatuses[i] || 'pending'}
          index={i}
          total={total}
        />
      ))}

      {/* Ambient + directional lights */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[0, 2, 2]} intensity={0.5} color="#ff5c1a" />
    </group>
  )
}

export default function RuntimePanel({ stepStatuses, activeStep, currentMessage }) {
  return (
    <div style={{
      width: '100%',
      height: 160,
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Step labels */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0 12px',
        zIndex: 2,
        pointerEvents: 'none',
      }}>
        {STEP_LABELS.map((label, i) => {
          const status = stepStatuses[i] || 'pending'
          return (
            <div key={i} style={{
              textAlign: 'center',
              color: status === 'done' ? 'var(--green)' :
                     status === 'in-progress' ? 'var(--fire)' :
                     'var(--text-3)',
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              letterSpacing: '0.04em',
              transition: 'color 0.3s',
            }}>
              {label.toUpperCase()}
            </div>
          )
        })}
      </div>

      {/* Status message */}
      {currentMessage && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 12,
          right: 12,
          fontSize: 11,
          color: 'var(--fire)',
          fontFamily: 'var(--font-mono)',
          zIndex: 2,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          ▶ {currentMessage}
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 7], fov: 40 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Pipeline stepStatuses={stepStatuses} />
      </Canvas>
    </div>
  )
}
