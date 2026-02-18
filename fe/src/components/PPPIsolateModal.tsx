import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { X, Activity, Unlock, Lock, Loader2 } from 'lucide-react';
import { useRouterStore } from '../store/routerStore';
import { type PPPUser } from '../api';

interface PPPIsolateModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: PPPUser | null;
    isIsolated: boolean;
    onConfirm: (targetProfile?: string) => void;
}

export function PPPIsolateModal({ isOpen, onClose, user, isIsolated, onConfirm }: PPPIsolateModalProps) {
    const { loading, getRouterProfiles, selectedRouter } = useRouterStore();
    const [profiles, setProfiles] = useState<string[]>([]);
    const [selectedProfile, setSelectedProfile] = useState('');
    const [fetchingProfiles, setFetchingProfiles] = useState(false);

    // Check if we need to ask for a profile (Un-isolating AND no original profile saved)
    const needsProfileSelection = Boolean(isOpen && isIsolated && user && !user.originalProfile);

    useEffect(() => {
        if (needsProfileSelection && selectedRouter) {
            setFetchingProfiles(true);
            getRouterProfiles(selectedRouter.id)
                .then((list) => {
                    // Filter out the isolir profile itself to avoid selecting it again
                    const filtered = list.filter(p => p !== selectedRouter.isolirProfile);
                    setProfiles(filtered);

                    // Default to 'default' if available, otherwise first one
                    if (filtered.includes('default')) {
                        setSelectedProfile('default');
                    } else if (filtered.length > 0) {
                        setSelectedProfile(filtered[0]);
                    }
                })
                .finally(() => setFetchingProfiles(false));
        }
    }, [isOpen, needsProfileSelection, selectedRouter, getRouterProfiles]);

    if (!isOpen || !user) return null;

    const handleConfirm = () => {
        if (needsProfileSelection) {
            onConfirm(selectedProfile);
        } else {
            onConfirm();
        }
    };

    return createPortal(
        <div className="modal-overlay" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'none' }}>
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
                                ? (needsProfileSelection
                                    ? `Profile asli user "${user.name}" tidak ditemukan. Silakan pilih profile tujuan untuk membuka isolir:`
                                    : `Yakin ingin mengembalikan profil user ${user.name} ke profil aslinya (${user.originalProfile})?`
                                )
                                : `Yakin ingin memindahkan user ${user.name} ke profil isolir? Koneksi aktif akan diputus.`
                            }
                        </p>

                        {needsProfileSelection && (
                            <div style={{ marginTop: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Pilih Profile Tujuan:</label>
                                {fetchingProfiles ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                        <Loader2 size={14} className="spinning" />
                                        Fetching profiles...
                                    </div>
                                ) : (
                                    <select
                                        className="form-select"
                                        value={selectedProfile}
                                        onChange={(e) => setSelectedProfile(e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="" disabled>Pilih Profile...</option>
                                        {profiles.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer-simple">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={loading || (needsProfileSelection && !selectedProfile)}
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
                        {loading ? 'Processing...' : (isIsolated ? 'Buka Isolir' : 'Isolir Sekarang')}
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
                    
                    .spinning { animation: spin 1s linear infinite; }
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        </div>,
        document.body
    );
}
