import { createPortal } from 'react-dom';
import { X, Activity, Unlock, Lock } from 'lucide-react';
import { useRouterStore } from '../store/routerStore';
import { type PPPUser } from '../api';

interface PPPIsolateModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: PPPUser | null;
    isIsolated: boolean;
    onConfirm: () => void;
}

export function PPPIsolateModal({ isOpen, onClose, user, isIsolated, onConfirm }: PPPIsolateModalProps) {
    const { loading } = useRouterStore();

    if (!isOpen || !user) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'none' }}>
            <div className="modal simple-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-simple">
                    <div className="modal-title-simple">
                        <Activity size={18} />
                        <span>{isIsolated ? 'Buka Isolir' : 'Isolir'} User: {user.name}</span>
                    </div>
                    <button className="close-btn-simple" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body-simple">
                    <div className="input-group-simple">
                        <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.5' }}>
                            {isIsolated
                                ? `Yakin ingin mengembalikan profil user ${user.name} ke profil aslinya?`
                                : `Yakin ingin memindahkan user ${user.name} ke profil isolir? Koneksi aktif akan diputus.`
                            }
                        </p>
                    </div>
                </div>

                <div className="modal-footer-simple">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={onConfirm}
                        disabled={loading}
                        style={{
                            backgroundColor: isIsolated ? 'var(--success)' : 'var(--danger)',
                            color: '#fff',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {isIsolated ? <Unlock size={16} /> : <Lock size={16} />}
                        <span>{loading ? 'Processing...' : (isIsolated ? 'Buka isolir sekarang' : 'Isolir sekarang')}</span>
                    </button>
                </div>

                <style>{`
                    .simple-modal {
                        background: var(--bg-secondary);
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        width: 90%;
                        max-width: 400px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                    }

                    .modal-header-simple {
                        padding: 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1px solid var(--border-color);
                    }

                    .modal-title-simple {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-weight: 600;
                        font-size: 15px;
                        color: var(--text-primary);
                    }

                    .close-btn-simple {
                        background: transparent;
                        border: none;
                        color: var(--text-muted);
                        cursor: pointer;
                        padding: 4px;
                        display: flex;
                    }
                    .close-btn-simple:hover { color: var(--danger); }

                    .modal-body-simple { padding: 16px; }

                    .input-group-simple label {
                        display: block;
                        font-size: 12px;
                        font-weight: 600;
                        color: var(--text-secondary);
                        margin-bottom: 6px;
                        text-transform: uppercase;
                    }

                    .modal-tip-simple {
                        margin-top: 12px;
                        display: flex;
                        gap: 8px;
                        align-items: center;
                        color: var(--text-muted);
                        font-size: 11px;
                    }

                    .modal-footer-simple {
                        padding: 12px 16px 16px;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        border-top: 1px solid var(--border-color);
                        background: rgba(0,0,0,0.02);
                    }
                    body.light-mode .modal-footer-simple { background: #f8fafc; }
                `}</style>
            </div>
        </div>,
        document.body
    );
}
