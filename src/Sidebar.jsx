import './Sidebar.css'

const NAV_ITEMS = [
  { id: 'recipes', label: 'Recipes', icon: '⚗️' },
  { id: 'mix', label: 'Mix', icon: '⚖️' },
  { id: 'tests', label: 'Tests', icon: '🧪' },
  { id: 'firings', label: 'Firings', icon: '🔥' },
  { id: 'clay-bodies', label: 'Clay Bodies', icon: '🏺' },
  { id: 'materials', label: 'Materials', icon: '📦' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar({ currentScreen, onNavigate, userName, onSignOut }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-logo">Glaze Lab</h1>
        <p className="sidebar-user">{userName}</p>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${currentScreen === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <button className="sidebar-signout" onClick={onSignOut}>Sign out</button>
    </div>
  )
}