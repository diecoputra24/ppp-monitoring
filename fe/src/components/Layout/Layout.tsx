import { useEffect, useState } from 'react';
import { Router, Plus, Activity, Menu, X, Sun, Moon } from 'lucide-react';
import { useRouterStore } from '../../store/routerStore';
import { useUiStore } from '../../store/uiStore';
import { RouterCard } from '../RouterCard';
import { RouterFormModal } from '../RouterFormModal';
import { PPPUserTable } from '../PPPUserTable';
import { UserManagement } from '../Admin/UserManagement';
import { ProfileDropdown } from '../Auth';
import './Layout.css';

export function Layout() {
    const { routers, selectedRouter, selectRouter, fetchRouters, fetchPPPUsers, loading } = useRouterStore();
    const { currentView, setCurrentView } = useUiStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : true; // Default to dark
    });

    useEffect(() => {
        fetchRouters();
    }, [fetchRouters]);

    useEffect(() => {
        if (selectedRouter) {
            fetchPPPUsers(selectedRouter.id);
            // Close sidebar on mobile after selecting a router
            setIsSidebarOpen(false);
        }
    }, [selectedRouter, fetchPPPUsers]);

    // Theme effect
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    return (
        <div className="layout">
            {/* Header */}
            <header className="header">
                <div className="header-content">
                    <div className="header-brand">
                        {/* Hamburger Button (Mobile Only) */}
                        <button
                            className="hamburger-btn"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            aria-label="Toggle menu"
                        >
                            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>

                        <div className="header-logo">
                            <Activity size={20} />
                        </div>
                        <h1 onClick={() => setCurrentView('dashboard')} style={{ cursor: 'pointer' }}>PPP Monitor</h1>
                    </div>

                    <div className="header-actions">
                        <label className="theme-switch" title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                            <input
                                type="checkbox"
                                checked={isDarkMode}
                                onChange={toggleTheme}
                            />
                            <span className="slider">
                                <span className="slider-icon moon"><Moon size={12} /></span>
                                <span className="slider-icon sun"><Sun size={12} /></span>
                            </span>
                        </label>
                        <ProfileDropdown />
                    </div>
                </div>
            </header>

            <div className="main-container">
                {/* Fixed Overlay for Mobile */}
                {isSidebarOpen && (
                    <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
                )}

                {/* Sidebar */}
                {currentView === 'dashboard' && (
                    <aside className={`sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
                        <div className="sidebar-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Router size={18} />
                                <span style={{ fontWeight: '600' }}>Routers</span>
                            </div>
                            <button className="btn btn-sm btn-primary" onClick={() => setShowAddModal(true)}>
                                <Plus size={16} />
                                Add
                            </button>
                        </div>

                        <div className="sidebar-content">
                            {loading && routers.length === 0 ? (
                                <div className="loader-container">
                                    <div className="loader" />
                                </div>
                            ) : routers.length === 0 ? (
                                <div className="sidebar-empty-state">
                                    <div className="s-empty-icon">
                                        <Router size={32} />
                                    </div>
                                    <h3>Belum Ada Router</h3>
                                    <p>Tambahkan router pertama Anda untuk mulai memantau.</p>
                                    <button className="btn btn-sm btn-primary" onClick={() => setShowAddModal(true)}>
                                        <Plus size={14} />
                                        Tambah Router
                                    </button>
                                </div>
                            ) : (
                                <div className="router-list">
                                    {routers.map((router) => (
                                        <RouterCard
                                            key={router.id}
                                            router={router}
                                            isSelected={selectedRouter?.id === router.id}
                                            onSelect={() => selectRouter(router)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>
                )}

                {/* Main Content */}
                <main className={`main-content ${currentView !== 'dashboard' ? 'full-width' : ''}`}>
                    {currentView === 'dashboard' ? (
                        <PPPUserTable />
                    ) : (
                        <UserManagement />
                    )}
                </main>
            </div>

            {/* Add Router Modal */}
            <RouterFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
        </div>
    );
}
