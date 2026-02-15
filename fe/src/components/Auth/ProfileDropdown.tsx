import { useState, useRef, useEffect } from 'react';
import { LogOut, Key, ChevronDown, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ChangePasswordModal } from './ChangePasswordModal';
import { UpdateProfileModal } from './UpdateProfileModal';

export function ProfileDropdown() {
    const { user, signOut } = useAuthStore();
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

    if (!user) return null;

    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <>
            <div className="profile-dropdown" ref={dropdownRef}>
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
                                <span className="profile-menu-name">{user.name}</span>
                                <span className="profile-menu-email">{user.email}</span>
                            </div>
                        </div>

                        <div className="profile-menu-divider" />

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
        </>
    );
}
