import { useState, type FormEvent } from 'react';
import { Activity, Mail, Lock, Eye, EyeOff, LogIn, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './Auth.css';

interface LoginPageProps {
    onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
    const { signIn, loading } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await signIn({ email, password });
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
                        <p>Sistem monitoring MikroTik PPPoE real-time untuk mengelola koneksi pelanggan Anda.</p>
                        <div className="auth-brand-features">
                            <div className="auth-feature">
                                <div className="auth-feature-dot" />
                                <span>Monitoring real-time</span>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-dot" />
                                <span>Multi-router support</span>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-dot" />
                                <span>Isolir otomatis</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Form */}
                <div className="auth-form-section">
                    <div className="auth-form-wrapper">
                        <div className="auth-form-header">
                            <h1>Masuk</h1>
                            <p>Masuk ke akun Anda untuk melanjutkan</p>
                        </div>

                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="auth-field">
                                <label htmlFor="login-email">Email</label>
                                <div className="auth-input-wrapper">
                                    <Mail size={18} className="auth-input-icon" />
                                    <input
                                        id="login-email"
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
                                <label htmlFor="login-password">Password</label>
                                <div className="auth-input-wrapper">
                                    <Lock size={18} className="auth-input-icon" />
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="input auth-input"
                                        placeholder="Masukkan password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        autoComplete="current-password"
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
                                        <LogIn size={18} />
                                        Masuk
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <span>Belum punya akun?</span>
                            <button className="auth-link" onClick={onSwitchToRegister}>
                                Daftar sekarang
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
