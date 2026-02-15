import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Server } from 'lucide-react';
import { useRouterStore } from '../store/routerStore';
import type { CreateRouterDto } from '../api';

interface RouterFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editData?: {
        id: string;
        name: string;
        host: string;
        port: number;
        username: string;
        password: string;
        isActive: boolean;
        isolirProfile?: string;
        telegramBotToken?: string;
        telegramChatId?: string;
    } | null;
}

export function RouterFormModal({ isOpen, onClose, editData }: RouterFormModalProps) {
    const { createRouter, updateRouter, loading, getRouterProfiles } = useRouterStore();
    const [availableProfiles, setAvailableProfiles] = useState<string[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);

    const [formData, setFormData] = useState<CreateRouterDto>({
        name: '',
        host: '',
        port: 8728,
        username: '',
        password: '',
        isActive: true,
        isolirProfile: '',
        telegramBotToken: '',
        telegramChatId: '',
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: editData?.name || '',
                host: editData?.host || '',
                port: editData?.port || 8728,
                username: editData?.username || '',
                password: editData?.password || '',
                isActive: editData?.isActive ?? true,
                isolirProfile: (editData as any)?.isolirProfile || '',
                telegramBotToken: (editData as any)?.telegramBotToken || '',
                telegramChatId: (editData as any)?.telegramChatId || '',
            });

            if (editData?.id) {
                setLoadingProfiles(true);
                getRouterProfiles(editData.id).then((profiles) => {
                    setAvailableProfiles(profiles);
                    setLoadingProfiles(false);
                });
            } else {
                setAvailableProfiles([]);
            }
        }
    }, [isOpen, editData, getRouterProfiles]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editData) {
                await updateRouter(editData.id, formData);
            } else {
                await createRouter(formData);
            }
            onClose();
        } catch (error) {
            console.error('Error saving router:', error);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'none' }}>
            <div className="modal simple-router-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-simple">
                    <div className="modal-title-simple">
                        <Server size={18} />
                        <span>{editData ? 'Edit Router' : 'Add Router'}</span>
                    </div>
                    <button className="close-btn-simple" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body-simple">
                        <div className="simple-form-grid">
                            <div className="input-group-simple">
                                <label>Router Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="MikroTik"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div className="input-group-simple" style={{ flex: 1 }}>
                                    <label>IP / Host</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="192.168.1.1"
                                        value={formData.host}
                                        onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="input-group-simple" style={{ width: '80px' }}>
                                    <label>Port</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={formData.port}
                                        onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 8728 })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group-simple">
                                <label>Username</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="input-group-simple">
                                <label>Password</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required={!editData}
                                />
                            </div>

                            <div className="input-group-simple">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>Profile Isolir (Opsional)</label>
                                    {loadingProfiles && <span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>Loading...</span>}
                                </div>

                                {editData ? (
                                    <select
                                        className="input"
                                        value={formData.isolirProfile || ''}
                                        onChange={(e) => setFormData({ ...formData, isolirProfile: e.target.value })}
                                        style={{ appearance: 'auto' }}
                                    >
                                        <option value="">-- Pilih Profile (atau biarkan kosong) --</option>
                                        {availableProfiles.length > 0 ? (
                                            availableProfiles.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))
                                        ) : (
                                            formData.isolirProfile && <option value={formData.isolirProfile}>{formData.isolirProfile}</option>
                                        )}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Simpan router dulu untuk load profile"
                                        value={formData.isolirProfile || ''}
                                        onChange={(e) => setFormData({ ...formData, isolirProfile: e.target.value })}
                                        disabled={true}
                                        title="Simpan router terlebih dahulu untuk mengambil list profile dari Mikrotik"
                                    />
                                )}

                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                    {editData ? 'Pilih profile yang digunakan untuk mengisolir user.' : 'Simpan router terlebih dahulu untuk memilih profile.'}
                                </span>
                            </div>

                            <div className="input-group-simple">
                                <label>Telegram Bot Token (Opsional)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                    value={formData.telegramBotToken || ''}
                                    onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                                />
                            </div>

                            <div className="input-group-simple">
                                <label>Telegram Chat ID (Opsional)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="-1001234567890"
                                    value={formData.telegramChatId || ''}
                                    onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer-simple">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Processing...' : 'Save Router'}
                        </button>
                    </div>
                </form>

                <style>{`
                    .simple-router-modal {
                        background: var(--bg-secondary);
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        width: 90%;
                        max-width: 450px;
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
                    .modal-body-simple { padding: 18px; }
                    .simple-form-grid { display: flex; flex-direction: column; gap: 14px; }
                    .input-group-simple label {
                        display: block;
                        font-size: 11px;
                        font-weight: 700;
                        color: var(--text-muted);
                        margin-bottom: 6px;
                    }
                    .modal-footer-simple {
                        padding: 12px 18px 18px;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        border-top: 1px solid var(--border-color);
                        background: rgba(0,0,0,0.02);
                    }
                    body.light-mode .modal-footer-simple { background: #f8fafc; }
                `}</style>
            </div >
        </div >,
        document.body
    );
}
