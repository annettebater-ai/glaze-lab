import { useState, useRef, useEffect } from 'react'
import './SubstitutionAssistant.css'

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" fill="#c8a96e"/>
  </svg>
)

function buildSystemPrompt(recipe) {
  const baseList = (recipe.baseIngredients || [])
    .map(i => `  - ${i.material}: ${i.percent}%`)
    .join('\n')
  const additiveList = (recipe.additives || [])
    .filter(a => a.material)
    .map(a => `  - ${a.material}: ${a.percent}% of base`)
    .join('\n')

  const umf = recipe.chemistry?.unity || {}
  const ratios = recipe.chemistry?.ratios || {}
  const stull = recipe.chemistry?.stull || {}

  return `You are a ceramic glaze chemistry expert embedded in Glaze Notes. A potter is mid-session mixing a glaze batch and needs your help.

CURRENT RECIPE: ${recipe.name}
Cone: ${recipe.cone} | Atmosphere: ${recipe.atmosphere}

BASE GLAZE (100%):
${baseList || '  None listed'}

ADDITIVES:
${additiveList || '  None'}

CHEMISTRY:
- Glaze type: ${stull.zone || 'unknown'}
- Food safety: ${ratios.foodSafety || 'unknown'}
- SiO2:Al2O3 ratio: ${ratios.silicaAlumina || 'unknown'}
- KNa:CaMg ratio: ${ratios.knaCamg || 'unknown'}
- UMF fluxes: ${JSON.stringify(umf)}

For substitution questions, respond ONLY with this JSON:
{
  "type": "substitution",
  "missing_material": "material name",
  "substitutions": [
    {
      "material": "name",
      "adjustment": "use X% instead of Y%",
      "notes": "brief chemistry note",
      "recommended": true
    }
  ],
  "impact": "anticipated fired result changes"
}

For all other questions, respond ONLY with this JSON:
{
  "type": "general",
  "answer": "your answer",
  "tips": ["tip 1", "tip 2"]
}

Always respond with valid JSON only. No markdown, no preamble, no explanation outside the JSON.`
}

function PanelContent({ recipe, messages, loading, input, setInput, onSend, onClose, messagesEndRef }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const renderMessage = (msg, i) => {
    if (msg.role === 'user') {
      return (
        <div key={i} className="sa-msg sa-msg-user">
          <div className="sa-bubble sa-bubble-user">{msg.text}</div>
        </div>
      )
    }

    if (msg.type === 'welcome' || msg.type === 'error') {
      return (
        <div key={i} className="sa-msg sa-msg-assistant">
          <div className="sa-avatar"><SparkleIcon /></div>
          <div className={msg.type === 'error' ? 'sa-bubble sa-bubble-error' : 'sa-bubble sa-bubble-assistant'}>
            {msg.text}
          </div>
        </div>
      )
    }

    if (msg.type === 'substitution' && msg.parsed) {
      const { missing_material, substitutions, impact } = msg.parsed
      return (
        <div key={i} className="sa-msg sa-msg-assistant">
          <div className="sa-avatar"><SparkleIcon /></div>
          <div className="sa-sub-card">
            <div className="sa-sub-title">Substitutions for {missing_material}</div>
            {substitutions?.map((sub, si) => (
              <div key={si} className={`sa-sub-option ${sub.recommended ? 'recommended' : ''}`}>
                <div className="sa-sub-header">
                  <span className="sa-sub-material">{sub.material}</span>
                  {sub.recommended && <span className="sa-sub-badge">Recommended</span>}
                </div>
                <div className="sa-sub-adjustment">{sub.adjustment}</div>
                <div className="sa-sub-notes">{sub.notes}</div>
              </div>
            ))}
            {impact && (
              <div className="sa-sub-impact">
                <span className="sa-impact-label">Anticipated impact: </span>
                {impact}
              </div>
            )}
          </div>
        </div>
      )
    }

    if (msg.type === 'general' && msg.parsed) {
      return (
        <div key={i} className="sa-msg sa-msg-assistant">
          <div className="sa-avatar"><SparkleIcon /></div>
          <div className="sa-bubble sa-bubble-assistant">
            <p>{msg.parsed.answer}</p>
            {msg.parsed.tips?.length > 0 && (
              <ul className="sa-tips">
                {msg.parsed.tips.map((tip, ti) => <li key={ti}>{tip}</li>)}
              </ul>
            )}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <>
      <div className="sa-panel-header">
        <div className="sa-panel-title">
          <span className="sa-header-icon">✦</span>
          <span>Sidekick</span>
        </div>
        <button className="sa-close" onClick={onClose}>✕</button>
      </div>
      <div className="sa-panel-context">
        {recipe.name} · Cone {recipe.cone} · {recipe.atmosphere}
      </div>
      <div className="sa-messages">
        {messages.map((msg, i) => renderMessage(msg, i))}
        {loading && (
          <div className="sa-msg sa-msg-assistant">
            <div className="sa-avatar"><SparkleIcon /></div>
            <div className="sa-bubble sa-bubble-assistant sa-loading">
              <span className="sa-dot" />
              <span className="sa-dot" />
              <span className="sa-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="sa-input-row">
        <textarea
          className="sa-input"
          placeholder="Ask about substitutions or glaze chemistry..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <button
          className={`sa-send ${input.trim() && !loading ? 'active' : ''}`}
          onClick={onSend}
          disabled={!input.trim() || loading}
        >↑</button>
      </div>
    </>
  )
}

export default function SubstitutionAssistant({ recipe, checkedIngredients }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        type: 'welcome',
        text: `I know this recipe inside out. Ask me about substitutions if you're short on an ingredient, or any chemistry questions about ${recipe.name}.`
      }])
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const appShell = document.querySelector('.app-shell')
    if (!appShell) return
    if (open && isDesktop) {
      appShell.classList.add('sidekick-open')
    } else {
      appShell.classList.remove('sidekick-open')
    }
    return () => appShell.classList.remove('sidekick-open')
  }, [open, isDesktop])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildSystemPrompt(recipe),
          messages: [
            ...messages
              .filter(m => m.role === 'user' || (m.role === 'assistant' && m.raw))
              .map(m => ({ role: m.role, content: m.raw || m.text })),
            { role: 'user', content: userMsg }
          ]
        })
      })

      const data = await response.json()
      const raw = data.content?.[0]?.text || ''
      const raw = data.content?.[0]?.text || ''
console.log('Raw response:', raw)
console.log('Full data:', JSON.stringify(data))

      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = { type: 'general', answer: raw, tips: [] }
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        type: parsed.type,
        parsed,
        raw
      }])
    } catch (err) {
      console.error('API error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        type: 'error',
        text: 'Something went wrong. Check your connection and try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => setOpen(false)

  if (!recipe) return null

  return (
    <>
      {!open && (
        <button className="sa-trigger" onClick={() => setOpen(true)}>
          <span className="sa-trigger-icon">✦</span>
          <span className="sa-trigger-label">Ask Sidekick</span>
        </button>
      )}

      {open && isDesktop && (
        <div className="sa-panel-desktop">
          <PanelContent
            recipe={recipe}
            messages={messages}
            loading={loading}
            input={input}
            setInput={setInput}
            onSend={sendMessage}
            onClose={handleClose}
            messagesEndRef={messagesEndRef}
          />
        </div>
      )}

      {open && !isDesktop && (
        <div className="sa-overlay" onClick={handleClose}>
          <div className="sa-panel-mobile" onClick={e => e.stopPropagation()}>
            <PanelContent
              recipe={recipe}
              messages={messages}
              loading={loading}
              input={input}
              setInput={setInput}
              onSend={sendMessage}
              onClose={handleClose}
              messagesEndRef={messagesEndRef}
            />
          </div>
        </div>
      )}
    </>
  )
}