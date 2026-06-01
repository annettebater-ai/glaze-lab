import './BottomNav.css'

const BOTTOM_ITEMS = [
  { id: 'recipes', label: 'Recipes', icon: '⚗️' },
  { id: 'mix', label: 'Mix', icon: '⚖️' },
  { id: 'tests', label: 'Tests', icon: '🧪' },
  { id: 'firings', label: 'Firings', icon: '🔥' },
  { id: 'more', label: 'More', icon: '···' },
]

export default function BottomNav({ currentScreen, onNavigate }) {
  const activeId = ['clay-bodies','materials','search','settings'].includes(currentScreen)
    ? 'more'
    : currentScreen

  return (
    <nav className="bottom-nav">
      {BOTTOM_ITEMS.map(item => (
        <button
          key={item.id}
          className={`bottom-tab ${activeId === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <span className="bottom-icon">{item.icon}</span>
          <span className="bottom-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
