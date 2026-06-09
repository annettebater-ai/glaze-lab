import { useEffect, useRef } from 'react'

// Stull chart zone boundaries
// X = Al2O3 (0 to 0.6), Y = SiO2 (0 to 6)
const ZONES = [
  {
    name: 'Underfired',
    color: 'rgba(220, 100, 80, 0.15)',
    border: 'rgba(220, 100, 80, 0.5)',
    // Below the matte line
  },
  {
    name: 'Matte',
    color: 'rgba(180, 140, 60, 0.15)',
    border: 'rgba(180, 140, 60, 0.5)',
  },
  {
    name: 'Microcrystalline',
    color: 'rgba(80, 140, 200, 0.15)',
    border: 'rgba(80, 140, 200, 0.5)',
  },
  {
    name: 'Glossy',
    color: 'rgba(60, 160, 80, 0.15)',
    border: 'rgba(60, 160, 80, 0.5)',
  },
]

// Stull chart zone lines (approximate)
// These are the boundary lines between zones
function getZoneColor(al2o3, sio2) {
  // Underfired: SiO2 < 1.5 * Al2O3 + 0.5 (approximate lower boundary)
  // Matte: between underfired and glossy lower boundary
  // Glossy: SiO2 > 4 * Al2O3 + 0.5 (approximate upper boundary)
  // Microcrystalline: high Al2O3, moderate SiO2

  const matteMin = 2.5 * al2o3 + 0.5
  const glossyMin = 4.5 * al2o3 + 0.5
  const underfiredMax = 1.5 * al2o3 + 0.3

  if (sio2 < underfiredMax) return { zone: 'underfired', color: 'rgba(220,100,80,0.12)' }
  if (sio2 > glossyMin) return { zone: 'glossy', color: 'rgba(60,160,80,0.12)' }
  if (al2o3 > 0.35 && sio2 < glossyMin && sio2 > matteMin) return { zone: 'microcrystalline', color: 'rgba(80,140,200,0.12)' }
  if (sio2 >= underfiredMax && sio2 <= matteMin) return { zone: 'matte', color: 'rgba(180,140,60,0.12)' }
  return { zone: 'glossy', color: 'rgba(60,160,80,0.12)' }
}

export default function StullChart({ al2o3, sio2, zone }) {
  const canvasRef = useRef(null)

  const X_MIN = 0
  const X_MAX = 0.7
  const Y_MIN = 0
  const Y_MAX = 7

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const PAD = { top: 20, right: 20, bottom: 40, left: 45 }
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom

    const toX = (al) => PAD.left + ((al - X_MIN) / (X_MAX - X_MIN)) * plotW
    const toY = (si) => PAD.top + plotH - ((si - Y_MIN) / (Y_MAX - Y_MIN)) * plotH

    // Clear
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(PAD.left, PAD.top, plotW, plotH)

    // Draw zone background by sampling grid
    const steps = 60
    const cellW = plotW / steps
    const cellH = plotH / steps
    for (let xi = 0; xi < steps; xi++) {
      for (let yi = 0; yi < steps; yi++) {
        const al = X_MIN + (xi / steps) * (X_MAX - X_MIN)
        const si = Y_MIN + ((steps - yi) / steps) * (Y_MAX - Y_MIN)
        const { color } = getZoneColor(al, si)
        ctx.fillStyle = color
        ctx.fillRect(
          PAD.left + xi * cellW,
          PAD.top + yi * cellH,
          cellW + 1,
          cellH + 1
        )
      }
    }

    // Zone boundary lines
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])

    // Underfired / matte boundary
    ctx.strokeStyle = 'rgba(180,140,60,0.6)'
    ctx.beginPath()
    for (let al = X_MIN; al <= X_MAX; al += 0.01) {
      const si = 1.5 * al + 0.3
      if (si < Y_MIN || si > Y_MAX) continue
      if (al === X_MIN) ctx.moveTo(toX(al), toY(si))
      else ctx.lineTo(toX(al), toY(si))
    }
    ctx.stroke()

    // Matte / glossy boundary
    ctx.strokeStyle = 'rgba(60,160,80,0.6)'
    ctx.beginPath()
    for (let al = X_MIN; al <= X_MAX; al += 0.01) {
      const si = 4.5 * al + 0.5
      if (si < Y_MIN || si > Y_MAX) continue
      if (al === X_MIN) ctx.moveTo(toX(al), toY(si))
      else ctx.lineTo(toX(al), toY(si))
    }
    ctx.stroke()

    // Matte boundary
    ctx.strokeStyle = 'rgba(80,140,200,0.6)'
    ctx.beginPath()
    for (let al = X_MIN; al <= X_MAX; al += 0.01) {
      const si = 2.5 * al + 0.5
      if (si < Y_MIN || si > Y_MAX) continue
      if (al === X_MIN) ctx.moveTo(toX(al), toY(si))
      else ctx.lineTo(toX(al), toY(si))
    }
    ctx.stroke()

    ctx.setLineDash([])

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 1
    for (let al = 0; al <= X_MAX; al += 0.1) {
      ctx.beginPath()
      ctx.moveTo(toX(al), PAD.top)
      ctx.lineTo(toX(al), PAD.top + plotH)
      ctx.stroke()
    }
    for (let si = 0; si <= Y_MAX; si += 1) {
      ctx.beginPath()
      ctx.moveTo(PAD.left, toY(si))
      ctx.lineTo(PAD.left + plotW, toY(si))
      ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(PAD.left, PAD.top)
    ctx.lineTo(PAD.left, PAD.top + plotH)
    ctx.lineTo(PAD.left + plotW, PAD.top + plotH)
    ctx.stroke()

    // X axis labels
    ctx.fillStyle = '#666'
    ctx.font = '10px system-ui'
    ctx.textAlign = 'center'
    for (let al = 0; al <= X_MAX; al += 0.1) {
      ctx.fillText(al.toFixed(1), toX(al), PAD.top + plotH + 14)
    }

    // Y axis labels
    ctx.textAlign = 'right'
    for (let si = 0; si <= Y_MAX; si += 1) {
      ctx.fillText(si.toFixed(0), PAD.left - 6, toY(si) + 4)
    }

    // Axis titles
    ctx.fillStyle = '#444'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('Al₂O₃', PAD.left + plotW / 2, H - 4)

    ctx.save()
    ctx.translate(12, PAD.top + plotH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('SiO₂', 0, 0)
    ctx.restore()

    // Zone labels
    ctx.font = 'bold 10px system-ui'
    ctx.fillStyle = 'rgba(180,140,60,0.8)'
    ctx.textAlign = 'left'
    ctx.fillText('MATTE', toX(0.05), toY(1.2))

    ctx.fillStyle = 'rgba(60,160,80,0.8)'
    ctx.fillText('GLOSSY', toX(0.05), toY(5.5))

    ctx.fillStyle = 'rgba(80,140,200,0.8)'
    ctx.fillText('MICRO', toX(0.38), toY(3.2))

    ctx.fillStyle = 'rgba(220,100,80,0.8)'
    ctx.fillText('UNDERFIRED', toX(0.05), toY(0.4))

    // Plot the glaze point
    if (al2o3 != null && sio2 != null && !isNaN(al2o3) && !isNaN(sio2)) {
      const px = toX(al2o3)
      const py = toY(sio2)

      // Outer glow
      ctx.beginPath()
      ctx.arc(px, py, 8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fill()

      // Point
      ctx.beginPath()
      ctx.arc(px, py, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#c8a96e'
      ctx.fill()
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Crosshairs
      ctx.strokeStyle = 'rgba(200,169,110,0.4)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(px, PAD.top)
      ctx.lineTo(px, PAD.top + plotH)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(PAD.left, py)
      ctx.lineTo(PAD.left + plotW, py)
      ctx.stroke()
      ctx.setLineDash([])

      // Label
      ctx.font = 'bold 10px system-ui'
      ctx.fillStyle = '#1a1a1a'
      ctx.textAlign = 'left'
      const labelX = px + 10 > PAD.left + plotW - 60 ? px - 70 : px + 10
      const labelY = py - 10 < PAD.top + 15 ? py + 18 : py - 10
      ctx.fillText(`Al: ${al2o3.toFixed(3)}`, labelX, labelY)
      ctx.fillText(`Si: ${sio2.toFixed(3)}`, labelX, labelY + 12)
    }

  }, [al2o3, sio2, zone])

  const hasData = al2o3 != null && sio2 != null && !isNaN(al2o3) && !isNaN(sio2)

  return (
    <div style={{marginTop: '12px'}}>
      <canvas
        ref={canvasRef}
        width={460}
        height={300}
        style={{
          width: '100%',
          maxWidth: '460px',
          height: 'auto',
          borderRadius: '8px',
          border: '1px solid #e8e8e8',
          display: 'block'
        }}
      />
      {!hasData && (
        <div style={{marginTop: '8px', fontSize: '13px', color: '#888'}}>
          No chemistry data available for this recipe.
        </div>
      )}
      {hasData && zone && (
        <div style={{marginTop: '8px', fontSize: '13px', color: '#555'}}>
          Zone: <strong style={{textTransform: 'capitalize'}}>{zone}</strong> · Al₂O₃ {al2o3?.toFixed(3)} · SiO₂ {sio2?.toFixed(3)}
        </div>
      )}
    </div>
  )
}