import { useState, useRef, useEffect } from 'react';
import { LogOut, Key, ChevronDown, Settings, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { ChangePasswordModal } from './ChangePasswordModal';
import { UpdateProfileModal } from './UpdateProfileModal';

export function ProfileDropdown() {
    const { user, signOut } = useAuthStore();
    const { setCurrentView } = useUiStore();
    const [isOpen, setIsOpen] = useState(false);
    const [showChangePw, setShowChangePw] = useState(false);
    const [showUpdateProfile, setShowUpdateProfile] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown when pressing Escape
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setIsOpen(false);
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!user) return null;

    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <div className="profile-dropdown">
                <button
                    className="profile-trigger"
                    onClick={() => setIsOpen(!isOpen)}
                    title={user.name}
                >
                    <div className="profile-avatar">
                        {initials}
                    </div>
                    <ChevronDown size={14} className={`profile-chevron ${isOpen ? 'is-open' : ''}`} />
                </button>

                {isOpen && (
                    <div className="profile-menu">
                        {/* User Info */}
                        <div className="profile-menu-header">
                            <div className="profile-avatar profile-avatar-lg">
                                {initials}
                            </div>
                            <div className="profile-menu-info">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span className="profile-menu-name">{user.name}</span>
                                    {/* Role Badge */}
                                    <span style={{
                                        fontSize: 10,
                                        padding: '2px 6px',
                                        borderRadius: 10,
                                        background: user.role === 'admin' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                        color: user.role === 'admin' ? '#10b981' : '#94a3b8',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5
                                    }}>
                                        {user.role || 'USER'}
                                    </span>
                                </div>
                                <span className="profile-menu-email">{user.email}</span>
                            </div>
                        </div>

                        <div className="profile-menu-divider" />

                        {/* Admin Menu */}
                        {user.role === 'admin' && (
                            <>
                                <button
                                    className="profile-menu-item"
                                    onClick={() => { setIsOpen(false); setCurrentView('user-management'); }}
                                >
                                    <Users size={16} />
                                    <span>Manajemen Pengguna</span>
                                </button>
                                <div className="profile-menu-divider" />
                            </>
                        )}

                        {/* Menu Items */}
                        <button
                            className="profile-menu-item"
                            onClick={() => { setIsOpen(false); setShowUpdateProfile(true); }}
                        >
                            <Settings size={16} />
                            <span>Ubah Profil</span>
                        </button>

                        <button
                            className="profile-menu-item"
                            onClick={() => { setIsOpen(false); setShowChangePw(true); }}
                        >
                            <Key size={16} />
                            <span>Ubah Password</span>
                        </button>

                        <div className="profile-menu-divider" />

                        <button
                            className="profile-menu-item profile-menu-item-danger"
                            onClick={() => { setIsOpen(false); signOut(); }}
                        >
                            <LogOut size={16} />
                            <span>Logout</span>
                        </button>
                    </div>
                )}
            </div>

            <ChangePasswordModal isOpen={showChangePw} onClose={() => setShowChangePw(false)} />
            <UpdateProfileModal isOpen={showUpdateProfile} onClose={() => setShowUpdateProfile(false)} />
        </div>
    );
}
