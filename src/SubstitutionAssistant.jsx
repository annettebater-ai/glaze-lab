import { useState, useRef, useEffect } from 'react'
import './SubstitutionAssistant.css'

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

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

  return `You are a ceramic glaze chemistry expert assistant embedded in Glaze Notes, a glaze management app. You are helping a potter who is currently in the middle of mixing a glaze batch.

CURRENT RECIPE: ${recipe.name}
Cone: ${recipe.cone} | Atmosphere: ${recipe.atmosphere}

BASE GLAZE (100%):
${baseList}

ADDITIVES:
${additiveList || '  None'}

CHEMISTRY:
- Glaze type: ${stull.zone || 'unknown'}
- Food safety: ${ratios.foodSafety || 'unknown'}
- SiO2:Al2O3 ratio: ${ratios.silicaAlumina || 'unknown'}
- KNa:CaMg ratio: ${ratios.knaCamg || 'unknown'}
- UMF: ${JSON.stringify(umf)}

When answering substitution questions, ALWAYS respond in this exact JSON format:
{
  "type": "substitution",
  "missing_material": "material name",
  "substitutions": [
    {
      "material": "substitute name",
      "adjustment": "use X% instead of Y%",
      "notes": "brief chemistry note",
      "recommended": true
    }
  ],
  "impact": "brief description of anticipated fired result changes"
}

For general chemistry questions, respond in this JSON format:
{
  "type": "general",
  "answer": "your answer here",
  "tips": ["tip 1", "tip 2"]
}

Always respond with valid JSON only. No markdown, no preamble.`
}

export default function SubstitutionAssistant({ recipe, checkedIngredients }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

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

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-client-side-api-key-access': 'true',
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
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

    if (msg.type === 'welcome') {
      return (
        <div key={i} className="sa-msg sa-msg-assistant">
          <div className="sa-avatar">GN</div>
          <div className="sa-bubble sa-bubble-assistant">{msg.text}</div>
        </div>
      )
    }

    if (msg.type === 'error') {
      return (
        <div key={i} className="sa-msg sa-msg-assistant">
          <div className="sa-avatar">GN</div>
          <div className="sa-bubble sa-bubble-error">{msg.text}</div>
        </div>
      )
    }

    if (msg.type === 'substitution' && msg.parsed) {
      const { missing_material, substitutions, impact } = msg.parsed
      return (
        <div key={i} className="sa-msg sa-msg-assistant">
          <div className="sa-avatar">GN</div>
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
      const { answer, tips } = msg.parsed
      return (
        <div key={i} className="sa-msg sa-msg-assistant">
          <div className="sa-avatar">GN</div>
          <div className="sa-bubble sa-bubble-assistant">
            <p>{answer}</p>
            {tips?.length > 0 && (
              <ul className="sa-tips">
                {tips.map((tip, ti) => <li key={ti}>{tip}</li>)}
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
      {/* Floating trigger button */}
      {!open && (
        <button className="sa-trigger" onClick={() => setOpen(true)}>
          <span className="sa-trigger-icon">✦</span>
          <span className="sa-trigger-label">Ask Glaze Notes</span>
        </button>
      )}

      {/* Slide-up panel */}
      {open && (
        <div className="sa-overlay" onClick={() => setOpen(false)}>
          <div className="sa-panel" onClick={e => e.stopPropagation()}>
            <div className="sa-panel-header">
              <div className="sa-panel-title">
                <span className="sa-header-icon">✦</span>
                <span>Sidekick</span>
              </div>
              <button className="sa-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="sa-panel-context">
              {recipe.name} · Cone {recipe.cone} · {recipe.atmosphere}
            </div>
            <div className="sa-messages">
              {messages.map((msg, i) => renderMessage(msg, i))}
              {loading && (
                <div className="sa-msg sa-msg-assistant">
                  <div className="sa-avatar">GN</div>
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
                onClick={sendMessage}
                disabled={!input.trim() || loading}
              >↑</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}