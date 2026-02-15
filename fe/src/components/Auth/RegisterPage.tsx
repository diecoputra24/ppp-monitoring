import { useState, type FormEvent } from 'react';
import { Activity, Mail, Lock, Eye, EyeOff, UserPlus, ArrowRight, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './Auth.css';

interface RegisterPageProps {
    onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
    const { signUp, loading } = useAuthStore();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await signUp({ name, email, password });
        } catch {
            // Error handled in store
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Left: Branding */}
                <div className="auth-branding">
                    <div className="auth-brand-content">
                        <div className="auth-brand-logo">
                            <Activity size={32} />
                        </div>
                        <h2>PPP Monitor</h2>
                        <p>Buat akun baru untuk mulai mengelola router MikroTik Anda.</p>
                        <div className="auth-brand-features">
                            <div className="auth-feature">
                                <div className="auth-feature-dot" />
                                <span>Gratis untuk memulai</span>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-dot" />
                                <span>Kelola router Anda sendiri</span>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-dot" />
                                <span>Data aman & terpisah</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Form */}
                <div className="auth-form-section">
                    <div className="auth-form-wrapper">
                        <div className="auth-form-header">
                            <h1>Daftar</h1>
                            <p>Buat akun baru untuk melanjutkan</p>
                        </div>

                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="auth-field">
                                <label htmlFor="reg-name">Nama</label>
                                <div className="auth-input-wrapper">
                                    <User size={18} className="auth-input-icon" />
                                    <input
                                        id="reg-name"
                                        type="text"
                                        className="input auth-input"
                                        placeholder="Nama lengkap"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        minLength={2}
                                        autoComplete="name"
                                    />
                                </div>
                            </div>

                            <div className="auth-field">
                                <label htmlFor="reg-email">Email</label>
                                <div className="auth-input-wrapper">
                                    <Mail size={18} className="auth-input-icon" />
                                    <input
                                        id="reg-email"
                                        type="email"
                                        className="input auth-input"
                                        placeholder="nama@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="auth-field">
                                <label htmlFor="reg-password">Password</label>
                                <div className="auth-input-wrapper">
                                    <Lock size={18} className="auth-input-icon" />
                                    <input
                                        id="reg-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="input auth-input"
                                        placeholder="Minimal 6 karakter"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="auth-toggle-pw"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary auth-submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="loader loader-white" style={{ width: 20, height: 20 }} />
                                ) : (
                                    <>
                                        <UserPlus size={18} />
                                        Daftar
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <span>Sudah punya akun?</span>
                            <button className="auth-link" onClick={onSwitchToLogin}>
                                Masuk
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
