import { useState, type FormEvent } from 'react';
import { X, Lock, Eye, EyeOff, Save } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const { changePassword, loading } = useAuthStore();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Konfirmasi password tidak cocok');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password baru minimal 6 karakter');
            return;
        }
        if (currentPassword === newPassword) {
            setError('Password baru tidak boleh sama dengan password saat ini');
            return;
        }

        try {
            await changePassword({ currentPassword, newPassword, confirmPassword });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onClose();
        } catch {
            // Error handled in store
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
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Ubah Password</h3>
                    <button
                        className="btn btn-icon btn-secondary"
                        onClick={onClose}
                        style={{ width: 32, height: 32 }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: 24 }}>
                    {error && (
                        <div style={{
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            padding: '10px 14px',
                            borderRadius: 4,
                            fontSize: 13,
                            marginBottom: 16,
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Current Password */}
                        <div className="auth-field">
                            <label htmlFor="cp-current" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                                Password Saat Ini
                            </label>
                            <div className="auth-input-wrapper">
                                <Lock size={18} className="auth-input-icon" />
                                <input
                                    id="cp-current"
                                    type={showCurrent ? 'text' : 'password'}
                                    className="input auth-input"
                                    placeholder="Masukkan password saat ini"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="auth-toggle-pw"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    tabIndex={-1}
                                >
                                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div className="auth-field">
                            <label htmlFor="cp-new" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                                Password Baru
                            </label>
                            <div className="auth-input-wrapper">
                                <Lock size={18} className="auth-input-icon" />
                                <input
                                    id="cp-new"
                                    type={showNew ? 'text' : 'password'}
                                    className="input auth-input"
                                    placeholder="Minimal 6 karakter"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="auth-toggle-pw"
                                    onClick={() => setShowNew(!showNew)}
                                    tabIndex={-1}
                                >
                                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="auth-field">
                            <label htmlFor="cp-confirm" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                                Konfirmasi Password Baru
                            </label>
                            <div className="auth-input-wrapper">
                                <Lock size={18} className="auth-input-icon" />
                                <input
                                    id="cp-confirm"
                                    type={showNew ? 'text' : 'password'}
                                    className="input auth-input"
                                    placeholder="Ulangi password baru"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
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
                                    Simpan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
