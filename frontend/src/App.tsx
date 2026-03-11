import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Search, Send, QrCode, CheckCircle, XCircle, RefreshCw, LogOut, Menu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Campaign from './pages/Campaign';
import Connection from './pages/Connection';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

function AppContent() {
  const { user, session, socket, logout, loading } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connected' | 'qr_ready'>('disconnected');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!socket || !user || !session) return;

    // Buscar status inicial com JWT
    fetch('/api/whatsapp/status', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
      .then(res => res.json())
      .then(data => setWsStatus(data.status))
      .catch(err => console.error("Erro ao buscar status:", err));

    socket.on('whatsapp_status', (status) => {
      console.log('Status update received:', status);
      setWsStatus(status);
    });

    socket.on('whatsapp_qr', () => {
      console.log('QR Code ready signal received');
      setWsStatus('qr_ready');
    });

    return () => {
      socket.off('whatsapp_status');
      socket.off('whatsapp_qr');
    };
  }, [socket, user, session]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-light)' }}>
        <RefreshCw className="spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <div className="app-layout">
        <nav className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
          <div style={{ display: 'flex', flexDirection: isCollapsed ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: isCollapsed ? '1.5rem' : '0' }}>
            <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <img src="/logo-icon-1.svg" alt="Icon" className="logo-icon" style={{ height: '28px', flexShrink: 0 }} />
              <img src="/logo-text.svg" alt="MindProspect" className="logo-text" style={{ height: '22px' }} />
            </div>
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expandir" : "Recolher"} 
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}
            >
              <Menu size={24} />
            </button>
          </div>
          
          <div className="user-info" style={{ padding: isCollapsed ? '0' : '0 1rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#fff', textAlign: isCollapsed ? 'center' : 'left' }}>
            Olá, <strong>{user.name}</strong>
          </div>

          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Search size={20} />
              <span>Buscar Leads</span>
            </NavLink>
            <NavLink to="/campaign" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Send size={20} />
              <span>Configurar Campanha</span>
              {leads.filter(l => l.selected).length > 0 && (
                <span className="badge-count">
                  {leads.filter(l => l.selected).length}
                </span>
              )}
            </NavLink>
            <NavLink to="/connection" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <QrCode size={20} />
              <span>Conectar WhatsApp</span>
            </NavLink>
          </div>

          <div className="sidebar-footer" style={{ marginTop: 'auto', padding: isCollapsed ? '1rem 0' : '1rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <div className={`status-indicator ${wsStatus}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {wsStatus === 'connected' ? (
                <CheckCircle size={16} color="#10b981" />
              ) : wsStatus === 'qr_ready' ? (
                <RefreshCw size={16} color="#f59e0b" className="spin" />
              ) : (
                <XCircle size={16} color="#ef4444" />
              )}
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                {wsStatus === 'connected' ? 'Online' : wsStatus === 'qr_ready' ? 'Aguardando QR' : 'Offline'}
              </span>
            </div>
            
            <button 
                onClick={logout} 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '4px'
                }}
                className="logout-btn"
            >
                <LogOut size={16} />
                <span>Sair</span>
            </button>
          </div>
        </nav>

        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard setLeads={setLeads} leads={leads} />} />
            <Route path="/campaign" element={<Campaign leads={leads} />} />
            <Route path="/connection" element={<Connection />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
