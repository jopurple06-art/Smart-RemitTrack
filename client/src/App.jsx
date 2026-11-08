import { useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Bell, ChartNoAxesCombined, CircleHelp, LayoutDashboard, LogOut, Menu, Plus, Send, X } from 'lucide-react';
import { useAuth } from './AuthContext.jsx';
import { useApiData } from './api.js';
import ReceiptPage from './ReceiptPage.jsx';
import { AnalyticsPage, DashboardPage, DetailPage, HistoryPage, LoginPage, NewTransferPage, NotificationsPage, ProfilePage, RegisterPage } from './pages.jsx';
import './styles.css';

function PrivateRoute() {
  const { user, checking } = useAuth();
  if (checking) return <div className="auth-screen"><p className="auth-subtitle">Checking your session…</p></div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AppShell() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data } = useApiData('/notifications', { unreadCount: 0 });
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/new', label: 'New transfer', icon: Plus },
    { to: '/transactions', label: 'Transactions', icon: Send },
    { to: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined }
  ];
  const title = location.pathname.startsWith('/transactions/') ? 'Transfer details' : navItems.find((item) => item.to === location.pathname)?.label || ({ '/notifications': 'Notifications', '/profile': 'Your profile' }[location.pathname] || 'Overview');

  return <div className="app-shell">
    {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-lockup"><div className="brand-mark"><Send size={18} strokeWidth={2.3} /></div><span>Smart<span className="brand-light"> RemitTrack</span></span><button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {navItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'New transfer' && <span className="nav-plus">+</span>}</NavLink>)}
      </nav>
      <div className="workspace-label secondary-label">YOUR ACCOUNT</div>
      <nav className="side-nav" aria-label="Account navigation">
        <NavLink to="/notifications" onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}><Bell size={18} /><span>Notifications</span>{data?.unreadCount > 0 && <span className="nav-count">{data.unreadCount}</span>}</NavLink>
        <NavLink to="/profile" onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}><div className="nav-avatar">{user?.name?.charAt(0)}</div><span>Profile & settings</span></NavLink>
      </nav>
      <div className="sidebar-bottom">
        <div className="support-note"><div className="support-icon"><CircleHelp size={17} /></div><div><strong>Need a hand?</strong><span>We're here to help.</span></div></div>
        <button className="logout-button" onClick={signOut}><LogOut size={17} /><span>Sign out</span></button>
        <div className="sidebar-footer">Smart RemitTrack <span>·</span> Demo</div>
      </div>
    </aside>
    <main className="main-panel">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button menu-trigger" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button><span className="breadcrumb-muted">Workspace</span><span className="breadcrumb-slash">/</span><span className="breadcrumb-current">{title}</span></div>
        <div className="topbar-right"><span className="secure-indicator"><span className="secure-dot" /> Secure workspace</span><NavLink to="/notifications" className="icon-button notification-trigger" aria-label="Notifications"><Bell size={19} />{data?.unreadCount > 0 && <i />}</NavLink><NavLink to="/profile" className="top-user"><span className="top-avatar">{user?.name?.charAt(0)}</span><span className="top-user-name">{user?.name?.split(' ')[0]}</span></NavLink></div>
      </header>
      <div className="page-wrap"><Outlet /></div>
      <footer className="page-footer"><span>Smart RemitTrack</span><span>Transfer clearly. Send confidently.</span></footer>
    </main>
  </div>;
}

function AuthFrame({ children }) {
  return <main className="auth-screen"><section className="auth-story"><div className="auth-story-brand"><div className="brand-mark"><Send size={18} /></div><span>Smart RemitTrack</span></div><div className="auth-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="route-line"><span /><span /><span /></div><div className="route-card"><div className="route-card-top"><span>TRANSFER STATUS</span><span className="status-chip status-received">Received</span></div><strong>$840.00 <span>→</span> ₹69,832</strong><div className="route-progress"><i /><i /><i /><i /><i /></div><small>Delivered to Priya Sharma</small></div><div className="auth-stamp"><Send size={14} /> TRACKED & CLEAR</div></div><div className="auth-story-copy"><p>GOOD THINGS<br />TRAVEL FAR.</p><span>Every transfer, accounted for.<br />Every person, closer.</span></div></section><section className="auth-content"><div className="auth-content-inner">{children}<p className="auth-legal">Your money moves with clarity. <span>© 2026 Smart RemitTrack</span></p></div></section></main>;
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<AuthFrame><LoginPage /></AuthFrame>} />
    <Route path="/register" element={<AuthFrame><RegisterPage /></AuthFrame>} />
    <Route element={<PrivateRoute />}>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="new" element={<NewTransferPage />} />
        <Route path="transactions" element={<HistoryPage />} />
        <Route path="transactions/:id/receipt" element={<ReceiptPage />} />
        <Route path="transactions/:id" element={<DetailPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
