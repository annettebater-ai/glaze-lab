import './Navigation.css'

function Navigation({ currentScreen, onNavigate }) {
  const tabs = [
    { id: 'recipes', label: 'Recipes', icon: '⚗️' },
    { id: 'tests', label: 'Tests', icon: '🧪' },
    { id: 'mix', label: 'Mix', icon: '⚖️' },
    { id: 'firings', label: 'Firings', icon: '🔥' },
    { id: 'search', label: 'Search', icon: '🔍' },
  ]

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${currentScreen === tab.id ? 'active' : ''}`}
          onClick={() => onNavigate(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default Navigation