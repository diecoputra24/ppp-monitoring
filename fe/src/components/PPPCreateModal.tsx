import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Activity, Save } from 'lucide-react';
import { useRouterStore } from '../store/routerStore';

interface PPPCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    routerId: string;
    onSuccess: () => void;
}

export function PPPCreateModal({ isOpen, onClose, routerId, onSuccess }: PPPCreateModalProps) {
    const { createPPPUser, getRouterProfiles } = useRouterStore();
    const [loading, setLoading] = useState(false);
    const [profiles, setProfiles] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        password: '',
        service: 'pppoe',
        profile: '',
        comment: ''
    });

    useEffect(() => {
        if (isOpen && routerId) {
            fetchProfiles();
        }
    }, [isOpen, routerId]);

    const fetchProfiles = async () => {
        try {
            const data = await getRouterProfiles(routerId);
            setProfiles(data);
            if (data.length > 0 && !formData.profile) {
                setFormData(prev => ({ ...prev, profile: data[0] }));
            }
        } catch (err) {
            console.error('Failed to fetch profiles:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await createPPPUser(formData);
            if (onSuccess) onSuccess();
            onClose();
            // Reset form
            setFormData({
                name: '',
                password: '',
                service: 'pppoe',
                profile: profiles[0] || '',
                comment: ''
            });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create PPP user');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'none' }}>
            <div className="modal simple-modal" style={{ maxWidth: '450px' }}>
                <div className="modal-header-simple">
                    <div className="modal-title-simple">
                        <UserPlus size={18} />
                        <span>Add PPP User</span>
                    </div>
                    <button className="close-btn-simple" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body-simple">
                        {error && <div className="error-alert-simple">{error}</div>}

                        <div className="form-grid-simple">
                            <div className="input-group-simple">
                                <label>Username</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Username"
                                    autoFocus
                                />
                            </div>

                            <div className="input-group-simple">
                                <label>Password</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    placeholder="Password"
                                />
                            </div>

                            <div className="input-group-simple">
                                <label>Service</label>
                                <select
                                    className="input"
                                    value={formData.service}
                                    onChange={e => setFormData({ ...formData, service: e.target.value })}
                                >
                                    <option value="pppoe">pppoe</option>
                                    <option value="any">any</option>
                                    <option value="pptp">pptp</option>
                                    <option value="l2tp">l2tp</option>
                                    <option value="ovpn">ovpn</option>
                                </select>
                            </div>

                            <div className="input-group-simple">
                                <label>Profile</label>
                                <select
                                    className="input"
                                    value={formData.profile}
                                    onChange={e => setFormData({ ...formData, profile: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>Pilih Profile...</option>
                                    {profiles.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group-simple full-width-simple">
                                <label>Comment</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.comment}
                                    onChange={e => setFormData({ ...formData, comment: e.target.value })}
                                    placeholder="Additional notes"
                                />
                            </div>
                        </div>

                        <div className="modal-tip-simple">
                            <Activity size={12} />
                            <span>This will create a new secret on your MikroTik.</span>
                        </div>
                    </div>

                    <div className="modal-footer-simple">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <Save size={16} />
                            <span>{loading ? 'Saving...' : 'Create User'}</span>
                        </button>
                    </div>
                </form>

                <style>{`
                    .simple-modal {
                        background: var(--bg-secondary);
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        width: 90%;
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

                    .form-grid-simple {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 16px;
                    }
                    
                    .full-width-simple {
                        grid-column: span 2;
                    }

                    .input-group-simple label {
                        display: block;
                        font-size: 11px;
                        font-weight: 600;
                        color: var(--text-muted);
                        margin-bottom: 6px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .error-alert-simple {
                        background: rgba(239, 68, 68, 0.1);
                        color: #ef4444;
                        padding: 10px;
                        border-radius: 4px;
                        font-size: 13px;
                        margin-bottom: 16px;
                        border: 1px solid rgba(239, 68, 68, 0.2);
                    }

                    .modal-tip-simple {
                        margin-top: 16px;
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

                    @media (max-width: 480px) {
                        .form-grid-simple {
                            grid-template-columns: 1fr;
                        }
                        .full-width-simple {
                            grid-column: span 1;
                        }
                    }
                `}</style>
            </div>
        </div>,
        document.body
    );
}
