import './MoreScreen.css'

const MORE_ITEMS = [
  { id: 'clay-bodies', label: 'Clay Bodies', icon: '🏺', description: 'Manage your clay body library' },
  { id: 'materials', label: 'Materials', icon: '📦', description: 'Inventory and sourcing' },
  { id: 'search', label: 'Search', icon: '🔍', description: 'Search across everything' },
  { id: 'settings', label: 'Settings', icon: '⚙️', description: 'App preferences and account' },
]

export default function MoreScreen({ onNavigate }) {
  return (
    <div className="more-screen">
      <h2 className="more-title">More</h2>
      <div className="more-list">
        {MORE_ITEMS.map(item => (
          <button
            key={item.id}
            className="more-item"
            onClick={() => onNavigate(item.id)}
          >
            <span className="more-icon">{item.icon}</span>
            <div className="more-text">
              <div className="more-label">{item.label}</div>
              <div className="more-desc">{item.description}</div>
            </div>
            <span className="more-chevron">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}