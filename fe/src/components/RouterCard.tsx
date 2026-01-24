import { useState } from 'react';
import { Router, Settings, Trash2, RefreshCw, Plug } from 'lucide-react';
import { useRouterStore } from '../store/routerStore';
import type { Router as RouterType } from '../api';
import { RouterFormModal } from './RouterFormModal';

interface RouterCardProps {
    router: RouterType;
    isSelected: boolean;
    onSelect: () => void;
}

export function RouterCard({ router, isSelected, onSelect }: RouterCardProps) {
    const { deleteRouter, testConnection, syncRouter, syncing } = useRouterStore();
    const [showEditModal, setShowEditModal] = useState(false);
    const [testing, setTesting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'failed'>('idle');

    const handleTest = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setTesting(true);
        try {
            const result = await testConnection(router.id);
            setConnectionStatus(result.isConnected ? 'connected' : 'failed');
            setTimeout(() => setConnectionStatus('idle'), 3000);
        } catch {
            setConnectionStatus('failed');
            setTimeout(() => setConnectionStatus('idle'), 3000);
        } finally {
            setTesting(false);
        }
    };

    const handleSync = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await syncRouter(router.id);
        } catch (error) {
            console.error('Sync failed:', error);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this router?')) {
            await deleteRouter(router.id);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short'
        });
    };

    return (
        <>
            <div
                className={`card router-card ${isSelected ? 'selected' : ''}`}
                onClick={onSelect}
                style={{
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <div className="card-body" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                        <div className="router-icon-wrapper">
                            <Router size={22} color="white" />
                            {router.isActive && <div className="online-indicator" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{router.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{router.host}</span>
                                <span className={`status-text ${router.isActive ? 'text-success' : 'text-danger'}`}>
                                    {router.isActive ? 'Online' : 'Offline'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="router-stats-line">
                        <div className="stat-item">
                            <span className="label">Last Sync</span>
                            <span className="value">{formatDate(router.lastSync)}</span>
                        </div>
                    </div>

                    <div className="router-actions">
                        <button
                            className={`btn btn-sm action-btn ${connectionStatus === 'connected' ? 'btn-success' : connectionStatus === 'failed' ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={handleTest}
                            disabled={testing}
                        >
                            <Plug size={14} />
                            {testing ? '...' : 'Test'}
                        </button>
                        <button className="btn btn-sm btn-secondary action-btn" onClick={handleSync} disabled={syncing}>
                            <RefreshCw size={14} className={syncing ? 'spinning' : ''} />
                            Sync
                        </button>
                        <div style={{ flex: 1 }} />
                        <button className="btn btn-sm btn-secondary icon-only" onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}>
                            <Settings size={14} />
                        </button>
                        <button className="btn btn-sm btn-danger icon-only" onClick={handleDelete}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                <style>{`
                    .router-card {
                        border: 1px solid var(--border-color);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .router-card.selected {
                        border-color: var(--accent-primary);
                        background: rgba(99, 102, 241, 0.05);
                        box-shadow: 0 0 25px rgba(99, 102, 241, 0.15);
                    }
                    body.light-mode .router-card.selected {
                        background: rgba(99, 102, 241, 0.03);
                    }
                    .router-icon-wrapper {
                        position: relative;
                        width: 44px;
                        height: 44px;
                        border-radius: 12px;
                        background: var(--accent-gradient);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }
                    .online-indicator {
                        position: absolute;
                        top: -2px;
                        right: -2px;
                        width: 12px;
                        height: 12px;
                        background: #10b981;
                        border: 2px solid var(--bg-secondary);
                        border-radius: 50%;
                    }
                    .status-text {
                        font-size: 10px;
                        text-transform: uppercase;
                        font-weight: 800;
                        letter-spacing: 0.5px;
                    }
                    .text-success { color: #10b981; }
                    .text-danger { color: #ef4444; }
                    
                    .router-stats-line {
                        margin-bottom: 16px;
                        padding: 8px 12px;
                        background: rgba(255, 255, 255, 0.03);
                        border-radius: 8px;
                    }
                    body.light-mode .router-stats-line {
                        background: rgba(0, 0, 0, 0.03);
                    }
                    .stat-item {
                        display: flex;
                        justify-content: space-between;
                        font-size: 11px;
                    }
                    .stat-item .label { color: var(--text-muted); }
                    .stat-item .value { color: var(--text-secondary); font-weight: 500; }
                    
                    .router-actions {
                        display: flex;
                        gap: 10px;
                        align-items: center;
                    }
                    .action-btn { font-size: 11px; height: 32px; padding: 0 12px; }
                    .icon-only { width: 32px; height: 32px; padding: 0; }
                    
                    .spinning { animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>

            <RouterFormModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                editData={router}
            />
        </>
    );
}
