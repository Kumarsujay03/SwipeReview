import { useState, useEffect } from 'react'
import Login from './components/Login'
import CardStack from './components/CardStack'
import History from './components/History'
import { History as HistoryIcon, Layers, LogOut } from 'lucide-react'
import './index.css'

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('stack'); // 'stack' or 'history'

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setView('stack');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <header style={{
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #fd297b 0%, #ff655b 100%)',
        boxShadow: '0 4px 20px rgba(253, 41, 123, 0.3)',
        zIndex: 10,
        borderRadius: '0 0 16px 16px',
        flexShrink: 0
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'white',
          fontWeight: '700',
          letterSpacing: '-0.5px'
        }}>
          {view === 'stack' ? <Layers size={20} /> : <HistoryIcon size={20} />}
          {view === 'stack' ? 'Review' : 'History'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '13px',
            color: 'white',
            fontWeight: '500',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '4px 10px',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)'
          }}>
            {user.name}
          </div>
          <button
            onClick={() => setView(view === 'stack' ? 'history' : 'stack')}
            style={{
              border: 'none',
              background: 'rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              color: 'white',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            title={view === 'stack' ? 'View History' : 'View Stack'}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            {view === 'stack' ? <HistoryIcon size={20} /> : <Layers size={20} />}
          </button>
          <button
            onClick={handleLogout}
            style={{
              border: 'none',
              background: 'rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              color: 'white',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            title="Logout"
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'stack' ? (
          <CardStack user={user} onActionComplete={() => { }} />
        ) : (
          <History user={user} />
        )}
      </main>
    </div>
  )
}

export default App
