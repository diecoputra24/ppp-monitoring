import { useState, type FormEvent } from 'react';
import { X, User, Mail, Save } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface UpdateProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UpdateProfileModal({ isOpen, onClose }: UpdateProfileModalProps) {
    const { user, updateProfile } = useAuthStore();
    const [name, setName] = useState(user?.name || '');
    const email = user?.email || ''; // Email is read-only
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateProfile(name); // Only update name
            setLoading(false);
            onClose();
        } catch (error) {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, margin: 'auto' }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Ubah Info Profil</h3>
                    <button
                        className="btn btn-icon btn-secondary"
                        onClick={onClose}
                        style={{ width: 32, height: 32 }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="auth-field">
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                                Nama Lengkap
                            </label>
                            <div className="auth-input-wrapper">
                                <User size={18} className="auth-input-icon" />
                                <input
                                    type="text"
                                    className="input auth-input"
                                    placeholder="Nama Anda"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-field">
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                                Alamat Email (Tidak dapat diubah)
                            </label>
                            <div className="auth-input-wrapper" style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                                <Mail size={18} className="auth-input-icon" />
                                <input
                                    type="email"
                                    className="input auth-input"
                                    value={email}
                                    readOnly
                                    disabled
                                    style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Batal
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? (
                                <div className="loader loader-white" style={{ width: 18, height: 18 }} />
                            ) : (
                                <>
                                    <Save size={16} />
                                    Simpan Perubahan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
