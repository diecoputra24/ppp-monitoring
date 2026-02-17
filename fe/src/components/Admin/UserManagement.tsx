import React, { useState, useEffect } from 'react';
import { adminApi, type AdminUser } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Trash2, Edit, ChevronLeft, Shield, Router as RouterIcon, X, AlertTriangle, Save, Search } from 'lucide-react';
import { toast } from '../../store/toastStore';
import './UserManagement.css';

export function UserManagement() {
    const { user: currentUser } = useAuthStore();
    const { setCurrentView } = useUiStore();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('user');
    const [saving, setSaving] = useState(false);

    // Delete Modal State
    const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [confirmInput, setConfirmInput] = useState('');

    // Router Modal State
    const [viewingRoutersUser, setViewingRoutersUser] = useState<AdminUser | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await adminApi.getUsers();
            setUsers(res.data.data);
        } catch (error) {
            toast.error('Gagal memuat data pengguna');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (user: AdminUser) => {
        setEditingUser(user);
        setEditName(user.name);
        setEditRole(user.role || 'user');
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setSaving(true);
        try {
            await adminApi.updateUser(editingUser.id, {
                name: editName,
                role: editRole,
            });
            toast.success('User berhasil diperbarui');
            setEditingUser(null);
            loadUsers();
        } catch (error) {
            toast.error('Gagal memperbarui user');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteClick = (user: AdminUser) => {
        setDeletingUser(user);
        setConfirmInput('');
    };

    const handleDelete = async () => {
        if (!deletingUser) return;

        if (confirmInput !== deletingUser.name) {
            toast.error('Nama konfirmasi tidak sesuai');
            return;
        }

        setDeleting(true);
        try {
            await adminApi.deleteUser(deletingUser.id);
            toast.success('User berhasil dihapus');
            setDeletingUser(null);
            setUsers(users.filter(u => u.id !== deletingUser.id));
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Gagal menghapus user';
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Access Control
    if (currentUser?.role !== 'admin') {
        return (
            <div className="access-denied">
                <Shield size={48} className="text-danger" />
                <h2>Akses Ditolak</h2>
                <p>Halaman ini hanya dapat diakses oleh Administrator.</p>
                <button className="btn btn-primary" onClick={() => setCurrentView('dashboard')}>
                    Kembali ke Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="user-management">
            <header className="page-header">
                <button className="btn btn-icon btn-secondary" onClick={() => setCurrentView('dashboard')}>
                    <ChevronLeft size={20} />
                </button>
                <div className="header-text">
                    <h1>Manajemen Pengguna</h1>
                    <p className="subtitle">Kelola daftar pengguna, hak akses, dan router</p>
                </div>
            </header>

            <div className="content-card">
                <div className="card-header">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Cari nama atau email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="stats">
                        <span className="text-muted">Total: {users.length} User</span>
                    </div>
                </div>

                {loading ? (
                    <div className="loader-container">
                        <div className="loader"></div>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Pengguna</th>
                                    <th>Role</th>
                                    <th>Router</th>
                                    <th>Terdaftar</th>
                                    <th className="text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar-placeholder">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="user-name">{user.name}</div>
                                                    <div className="user-email">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                                                {user.role?.toUpperCase() || 'USER'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="router-count-cell">
                                                <div className="router-count">
                                                    <RouterIcon size={14} />
                                                    <span>{user.routers?.length || 0}</span>
                                                </div>
                                                {user.routers?.length > 0 && (
                                                    <button
                                                        className="btn-view-routers"
                                                        onClick={() => setViewingRoutersUser(user)}
                                                    >
                                                        Lihat Detail
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-muted text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                                        <td className="text-right">
                                            <div className="action-buttons">
                                                <button
                                                    className="btn btn-icon btn-sm btn-ghost"
                                                    title="Edit User"
                                                    onClick={() => handleEditClick(user)}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                {user.id !== currentUser.id && (
                                                    <button
                                                        className="btn btn-icon btn-sm btn-ghost text-danger"
                                                        title="Hapus User"
                                                        onClick={() => handleDeleteClick(user)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-muted">
                                            Tidak ada pengguna ditemukan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="modal-overlay">
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <h3>Edit Pengguna</h3>
                            <button className="btn btn-icon btn-secondary" onClick={() => setEditingUser(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="modal-body">
                            <div className="form-group">
                                <label>Email (Tidak dapat diubah)</label>
                                <input type="email" className="input" value={editingUser.email} disabled readOnly style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                            </div>
                            <div className="form-group">
                                <label>Nama Lengkap</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    className="input"
                                    value={editRole}
                                    onChange={e => setEditRole(e.target.value)}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    <Save size={16} style={{ marginRight: 8 }} />
                                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingUser && (
                <div className="modal-overlay">
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3 className="text-danger flex items-center gap-2">
                                <AlertTriangle size={20} />
                                Hapus Pengguna
                            </h3>
                            <button className="btn btn-icon btn-secondary" onClick={() => setDeletingUser(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 16 }}>
                                Apakah Anda yakin ingin menghapus pengguna <strong>{deletingUser.name}</strong> ({deletingUser.email})?
                            </p>
                            <div className="alert-danger-box">
                                <p><strong>Perhatian:</strong> Tindakan ini tidak dapat dibatalkan. Semua Router dan data pelanggan PPP yang terkait dengan pengguna ini akan ikut <strong>terhapus permanen</strong>.</p>
                            </div>
                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label>Ketik nama pengguna <strong>{deletingUser.name}</strong> untuk konfirmasi:</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={confirmInput}
                                    onChange={(e) => setConfirmInput(e.target.value)}
                                    placeholder={deletingUser.name}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeletingUser(null)} disabled={deleting}>
                                Batal
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDelete}
                                disabled={deleting || confirmInput !== deletingUser.name}
                            >
                                {deleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Router List Modal */}
            {viewingRoutersUser && (
                <div className="modal-overlay">
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
                        <div className="modal-header">
                            <h3>Daftar Router: {viewingRoutersUser.name}</h3>
                            <button className="btn btn-icon btn-secondary" onClick={() => setViewingRoutersUser(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {viewingRoutersUser.routers && viewingRoutersUser.routers.length > 0 ? (
                                <table className="data-table router-list-table">
                                    <thead>
                                        <tr>
                                            <th>Nama Router</th>
                                            <th>Host / IP</th>
                                            <th>Port</th>
                                            <th>Username</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingRoutersUser.routers.map(router => (
                                            <tr key={router.id}>
                                                <td>{router.name}</td>
                                                <td>{router.host}</td>
                                                <td>{router.port}</td>
                                                <td>{router.username}</td>
                                                <td>
                                                    <span className={`badge ${router.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                                        {router.isActive ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-8 text-muted">
                                    Pengguna ini belum menambahkan router.
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setViewingRoutersUser(null)}>
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
