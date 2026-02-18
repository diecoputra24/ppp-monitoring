import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, RefreshCw, Activity, Globe, MessageSquare, Lock, Unlock, ExternalLink, ArrowUpDown, ChevronUp, ChevronDown, UserPlus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MapPin, Map } from 'lucide-react';
import { useRouterStore } from '../store/routerStore';
import { formatBytes, type PPPUser } from '../api';
import { PPPUserCommentModal } from './PPPUserCommentModal';
import { PPPIsolateModal } from './PPPIsolateModal';
import { SimpleAlertModal } from './SimpleAlertModal';
import { PPPCreateModal } from './PPPCreateModal';
import { PPPMapModal } from './PPPMapModal';
import { PPPCoordinateModal } from './PPPCoordinateModal';


export function PPPUserTable() {
    const {
        pppUsers,
        selectedRouter,
        fetchPPPUsers,
        loading,
        syncing,
        syncRouter,
        toggleIsolateUser
    } = useRouterStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Comment modal state
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [isolateModalOpen, setIsolateModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [alertModalOpen, setAlertModalOpen] = useState(false);
    const [mapModalOpen, setMapModalOpen] = useState(false);
    const [coordModalOpen, setCoordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<PPPUser | null>(null);

    const handleOpenCoordinate = (user: PPPUser) => {
        setSelectedUser(user);
        setCoordModalOpen(true);
    };

    const handleCoordSaved = useCallback(() => {
        if (selectedRouter) fetchPPPUsers(selectedRouter.id, true);
    }, [selectedRouter, fetchPPPUsers]);

    const handleOpenComment = (user: PPPUser) => {
        setSelectedUser(user);
        setCommentModalOpen(true);
    };

    const isUserIsolated = (user: PPPUser | null) => {
        if (!user || !selectedRouter?.isolirProfile) return false;
        return user.profile === selectedRouter.isolirProfile;
    };

    const handleOpenIsolate = (user: PPPUser) => {
        if (!selectedRouter?.isolirProfile) {
            setAlertModalOpen(true);
            return;
        }
        setSelectedUser(user);
        setIsolateModalOpen(true);
    };

    const handleConfirmIsolate = async (targetProfile?: string) => {
        if (selectedUser) {
            await toggleIsolateUser(selectedUser.name, undefined, targetProfile);
            setIsolateModalOpen(false);
        }
    };

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Helper to parse Mikrotik uptime string to seconds for sorting
    const parseUptimeToSeconds = (uptime?: string) => {
        if (!uptime || uptime === '-') return 0;
        let totalSeconds = 0;

        // Match 1w2d03:04:05 or 2d03:04:05 or 03:04:05
        const regex = /(?:(\d+)w)?(?:(\d+)d)?\s?(?:(\d+):)?(\d+):(\d+)/;
        const match = uptime.match(regex);

        if (match) {
            const weeks = parseInt(match[1] || '0');
            const days = parseInt(match[2] || '0');
            const hours = parseInt(match[3] || '0');
            const minutes = parseInt(match[4] || '0');
            const seconds = parseInt(match[5] || '0');
            totalSeconds = (weeks * 7 * 24 * 3600) + (days * 24 * 3600) + (hours * 3600) + (minutes * 60) + seconds;
        }
        return totalSeconds;
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30" />;
        return sortConfig.direction === 'asc'
            ? <ChevronUp size={14} className="text-primary" />
            : <ChevronDown size={14} className="text-primary" />;
    };

    // Debounce search term to improve performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300); // 300ms delay
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Track window width for conditional rendering
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 992;
            setIsMobile(mobile);
            setItemsPerPage(mobile ? 20 : 50);
        };
        // Initial set
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-refresh data from DB every 10 seconds to keep UI in sync with backend (Silent Update)
    useEffect(() => {
        if (!selectedRouter) return;

        // Initial fetch (shows loading)
        fetchPPPUsers(selectedRouter.id, false);

        const interval = setInterval(() => {
            // Background fetch (silent)
            fetchPPPUsers(selectedRouter.id, true);
        }, 10000);

        return () => clearInterval(interval);
    }, [selectedRouter, fetchPPPUsers]);

    // 1. Optimize filters & search using debounced term
    const filteredUsers = useMemo(() => {
        const searchLower = debouncedSearchTerm.toLowerCase();
        let result = pppUsers.filter((user) => {
            const matchesSearch = !debouncedSearchTerm ||
                user.name.toLowerCase().includes(searchLower) ||
                (String(user.comment || '').toLowerCase().includes(searchLower));

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'online' && user.isOnline) ||
                (statusFilter === 'offline' && !user.isOnline);

            return matchesSearch && matchesStatus;
        });

        if (sortConfig.key) {
            result.sort((a, b) => {
                let aVal: any = a[sortConfig.key as keyof PPPUser] || '';
                let bVal: any = b[sortConfig.key as keyof PPPUser] || '';

                if (sortConfig.key === 'uptime') {
                    aVal = parseUptimeToSeconds(a.uptime);
                    bVal = parseUptimeToSeconds(b.uptime);
                } else if (sortConfig.key === 'totalTxBytes' || sortConfig.key === 'totalRxBytes') {
                    aVal = BigInt(aVal || '0');
                    bVal = BigInt(bVal || '0');
                    return sortConfig.direction === 'asc'
                        ? (aVal < bVal ? -1 : aVal > bVal ? 1 : 0)
                        : (aVal > bVal ? -1 : aVal < bVal ? 1 : 0);
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [pppUsers, debouncedSearchTerm, statusFilter, sortConfig]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, statusFilter]);

    // Pagination Calculation
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(start, start + itemsPerPage);
    }, [filteredUsers, currentPage, itemsPerPage]);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // 2. Optimized stats calculation (single pass)
    const stats = useMemo(() => {
        let total = 0;
        let online = 0;
        let totalTx = BigInt(0);
        let totalRx = BigInt(0);

        for (const u of pppUsers) {
            total++;
            if (u.isOnline) online++;

            try {
                if (u.totalTxBytes) totalTx += BigInt(u.totalTxBytes);
                if (u.totalRxBytes) totalRx += BigInt(u.totalRxBytes);
            } catch (e) { /* ignore */ }
        }

        return {
            total,
            online,
            offline: total - online,
            totalTx: totalTx.toString(),
            totalRx: totalRx.toString()
        };
    }, [pppUsers]);

    // Removed duplicate useRouterStore destructuring here

    // ...

    const handleRefresh = async () => {
        if (selectedRouter && !syncing) {
            await syncRouter(selectedRouter.id);
        }
    };

    if (!selectedRouter) {
        return (
            <div className="card glass-card main-table-card empty-card-centered" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '500px',
                textAlign: 'center'
            }}>
                <div className="empty-state-main" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    maxWidth: '450px'
                }}>
                    <div className="empty-main-icon pulse-animation">
                        <Activity size={48} />
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px' }}>Pilih Router Untuk Memulai</h3>
                    <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                        Silakan pilih router dari sidebar di sebelah kiri untuk melihat data pengguna secara real-time.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="card glass-card main-table-card">
            <div className="table-header-custom">
                <div className="header-info">
                    <div className="router-badge-active">
                        <Globe size={14} />
                        <span>Connected</span>
                    </div>
                    <div className="header-titles">
                        <h2>PPP Users</h2>
                        <p>{selectedRouter.name} • {selectedRouter.host}</p>
                    </div>
                </div>
                <div className="header-controls">
                    <button className="btn btn-primary btn-sm" onClick={() => setCreateModalOpen(true)}>
                        <UserPlus size={14} />
                        <span className="btn-label">Tambah User</span>
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setMapModalOpen(true)} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <Map size={14} />
                        <span className="btn-label">Show Map</span>
                    </button>
                    <button
                        className="btn btn-secondary btn-sm refresh-btn"
                        onClick={handleRefresh}
                        disabled={loading || syncing}
                    >
                        <RefreshCw size={14} className={loading || syncing ? 'spinning' : ''} />
                        <span className="btn-label">{loading || syncing ? 'Syncing...' : 'Refresh'}</span>
                    </button>
                </div>
            </div>

            <div className="control-panel">
                <div className="premium-stats-grid">
                    <div className="premium-stat-card total">
                        <span className="p-stat-value">{stats.total}</span>
                        <span className="p-stat-label">Total Users</span>
                    </div>
                    <div className="premium-stat-card online">
                        <span className="p-stat-value">{stats.online}</span>
                        <span className="p-stat-label">Online</span>
                    </div>
                    <div className="premium-stat-card offline">
                        <span className="p-stat-value">{stats.offline}</span>
                        <span className="p-stat-label">Offline</span>
                    </div>
                    <div className="premium-stat-card traffic tx">
                        <span className="p-stat-value">{formatBytes(stats.totalTx)}</span>
                        <span className="p-stat-label">Total TX</span>
                    </div>
                    <div className="premium-stat-card traffic rx">
                        <span className="p-stat-value">{formatBytes(stats.totalRx)}</span>
                        <span className="p-stat-label">Total RX</span>
                    </div>
                </div>

                <div className="search-tabs-row">
                    <div className="modern-search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Find user or comment..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-tabs">
                        <button
                            className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('all')}
                        >
                            All {stats.total}
                        </button>
                        <button
                            className={`filter-tab online ${statusFilter === 'online' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('online')}
                        >
                            Online {stats.online}
                        </button>
                        <button
                            className={`filter-tab offline ${statusFilter === 'offline' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('offline')}
                        >
                            Offline {stats.offline}
                        </button>
                    </div>
                </div>
            </div>

            <div className="table-content-area">
                {/* Pagination Info Top (Optional, maybe just keep bottom) */}
                <div style={{ padding: '8px 20px', fontSize: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Showing {filteredUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users</span>
                    {filteredUsers.length > itemsPerPage && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                style={{ background: 'none', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, color: 'var(--text-primary)' }}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span style={{ fontWeight: 600 }}>{currentPage} / {totalPages}</span>
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                style={{ background: 'none', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, color: 'var(--text-primary)' }}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="loading-state-container">
                        <div className="spinner-circle"></div>
                        <p>Fetching data...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="empty-state-search">
                        <div className="empty-search-icon">
                            <Search size={40} />
                        </div>
                        <h3>Tidak ada kecocokan</h3>
                        <p>Coba gunakan kata kunci lain atau periksa filter status.</p>
                    </div>
                ) : isMobile ? (
                    <div className="user-cards-mobile">
                        {paginatedUsers.map((user) => (
                            <div key={`card-${user.name}`} className={`mobile-user-card ${user.isOnline ? 'card-online' : 'card-offline'}`}>
                                <div className="m-card-top">
                                    <div className="m-user-info" style={{ flex: 1 }}>
                                        <div className={`m-status-dot ${user.isOnline ? 'online' : ''}`} />
                                        <button
                                            className={`btn-comment-simple ${user.latitude ? 'active' : ''}`}
                                            onClick={() => handleOpenCoordinate(user)}
                                            style={{ color: '#f59e0b', padding: '2px' }}
                                        >
                                            <MapPin size={14} />
                                        </button>
                                        <span className="m-user-name">{user.name}</span>
                                        <div className="flex items-center gap-1" style={{ marginLeft: 'auto' }}>
                                            <button
                                                className={`btn-comment-simple ${user.comment ? 'active' : ''}`}
                                                onClick={() => handleOpenComment(user)}
                                                style={{ padding: '4px' }}
                                            >
                                                <MessageSquare size={16} />
                                            </button>
                                            {user.comment && (
                                                <span className="m-note-text">{user.comment}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="m-card-details">
                                    <div className="m-detail-row">
                                        <span>Profile</span>
                                        <div className="flex items-center gap-2">
                                            <span className="m-detail-val">{user.profile}</span>
                                            <button
                                                className={`btn-comment-simple ${isUserIsolated(user) ? 'active' : ''}`}
                                                onClick={() => handleOpenIsolate(user)}
                                                title={isUserIsolated(user) ? 'Buka Isolir' : 'Isolir User Ini'}
                                                style={{ color: isUserIsolated(user) ? 'var(--danger)' : 'var(--success)', padding: '2px' }}
                                            >
                                                {isUserIsolated(user) ? <Unlock size={14} /> : <Lock size={14} />}
                                            </button>

                                        </div>
                                    </div>
                                    <div className="m-detail-row">
                                        <span>Uptime</span>
                                        <span className={`m-detail-val ${user.isOnline ? 'text-success' : ''}`}>{user.uptime || '-'}</span>
                                    </div>
                                    <div className="m-detail-row">
                                        <span>IP Address</span>
                                        {user.address ? (
                                            <a
                                                href={`http://${user.address}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="m-detail-val ip-link"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span>{user.address}</span>
                                                <ExternalLink size={10} />
                                            </a>
                                        ) : (
                                            <span className="m-detail-val">-</span>
                                        )}
                                    </div>
                                </div>

                                <div className="m-traffic-compact">
                                    <div className="m-t-item">
                                        <span className="m-t-label">TX Session</span>
                                        <span className="m-t-value">{formatBytes(user.currentTxBytes)}</span>
                                    </div>
                                    <div className="m-t-item">
                                        <span className="m-t-label">TX Total</span>
                                        <span className="m-t-value font-bold text-success">{formatBytes(user.totalTxBytes)}</span>
                                    </div>
                                    <div className="m-t-item">
                                        <span className="m-t-label">RX Session</span>
                                        <span className="m-t-value">{formatBytes(user.currentRxBytes)}</span>
                                    </div>
                                    <div className="m-t-item">
                                        <span className="m-t-label">RX Total</span>
                                        <span className="m-t-value font-bold text-info">{formatBytes(user.totalRxBytes)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th onClick={() => requestSort('name')} className="sortable-header">
                                        <div className="flex items-center gap-1">
                                            User Info {getSortIcon('name')}
                                        </div>
                                    </th>
                                    <th>Profile</th>
                                    <th>Address</th>
                                    <th onClick={() => requestSort('uptime')} className="sortable-header">
                                        <div className="flex items-center gap-1">
                                            Uptime {getSortIcon('uptime')}
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('totalTxBytes')} className="text-right sortable-header">
                                        <div className="flex items-center justify-end gap-1">
                                            Traffic TX {getSortIcon('totalTxBytes')}
                                        </div>
                                    </th>
                                    <th onClick={() => requestSort('totalRxBytes')} className="text-right sortable-header">
                                        <div className="flex items-center justify-end gap-1">
                                            Traffic RX {getSortIcon('totalRxBytes')}
                                        </div>
                                    </th>
                                    <th className="text-left col-keterangan">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.map((user) => (
                                    <tr key={user.name}>
                                        <td>
                                            <span className={`status-badge ${user.isOnline ? 'online' : ''}`}>
                                                {user.isOnline ? 'Online' : 'Offline'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="user-info-cell" style={{ display: 'flex', alignItems: 'center' }}>
                                                <button
                                                    className={`btn-comment-simple ${user.latitude ? 'active' : ''}`}
                                                    onClick={() => handleOpenCoordinate(user)}
                                                    title={user.latitude ? `📍 ${user.latitude.toFixed(4)}, ${user.longitude?.toFixed(4)}` : 'Set koordinat'}
                                                    style={{ color: '#f59e0b', padding: '2px', marginRight: '4px' }}
                                                >
                                                    <MapPin size={13} />
                                                </button>
                                                <span className="u-name">{user.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className="profile-text">{user.profile}</span>
                                                <button
                                                    className={`btn-comment-simple ${isUserIsolated(user) ? 'active' : ''}`}
                                                    onClick={() => handleOpenIsolate(user)}
                                                    title={isUserIsolated(user) ? 'Buka Isolir' : 'Isolir User Ini'}
                                                    style={{ color: isUserIsolated(user) ? 'var(--danger)' : 'var(--success)' }}
                                                >
                                                    {isUserIsolated(user) ? <Unlock size={14} /> : <Lock size={14} />}
                                                </button>

                                            </div>
                                        </td>
                                        <td className="font-mono text-xs">
                                            {user.address ? (
                                                <a
                                                    href={`http://${user.address}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ip-link"
                                                >
                                                    <span>{user.address}</span>
                                                    <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td className={`font-medium ${user.isOnline ? 'text-success' : 'text-muted'}`}>{user.uptime || '-'}</td>
                                        <td className="text-right">
                                            <div className="traffic-stack">
                                                <div className="t-session" title="Sesi Terkini">{formatBytes(user.currentTxBytes)}</div>
                                                <div className="t-total text-success" title="Grand Total (History + Current)">{formatBytes(user.totalTxBytes)}</div>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="traffic-stack">
                                                <div className="t-session" title="Sesi Terkini">{formatBytes(user.currentRxBytes)}</div>
                                                <div className="t-total text-info" title="Grand Total (History + Current)">{formatBytes(user.totalRxBytes)}</div>
                                            </div>
                                        </td>
                                        <td className="text-left col-keterangan">
                                            <button
                                                className={`btn-comment-simple ${user.comment ? 'active' : ''}`}
                                                onClick={() => handleOpenComment(user)}
                                                title={user.comment || 'Add comment'}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <MessageSquare size={14} />
                                                {user.comment && <span className="u-comment-inline">{user.comment}</span>}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination Controls Bottom */}
            {filteredUsers.length > 0 && !loading && (
                <div className="pagination-controls">
                    <div className="pagination-info">
                        Showing <span className="text-highlight">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-highlight">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of <span className="text-highlight">{filteredUsers.length}</span> entries
                    </div>
                    <div className="pagination-buttons">
                        <button
                            className="p-btn"
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                            title="First Page"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            className="p-btn"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            title="Previous Page"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="page-indicator">
                            Page {currentPage} of {totalPages}
                        </div>

                        <button
                            className="p-btn"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            title="Next Page"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            className="p-btn"
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            title="Last Page"
                        >
                            <ChevronsRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .glass-card { background: var(--bg-card); border: 1px solid var(--border-color); }
                .table-header-custom { padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); }
                .header-info { display: flex; align-items: center; gap: 12px; }
                .router-badge-active { display: flex; align-items: center; gap: 6px; padding: 2px 8px; background: var(--success-bg); color: var(--success); border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
                .header-titles h2 { font-size: 16px; font-weight: 700; margin: 0; }
                .header-titles p { font-size: 12px; color: var(--text-muted); margin: 0; }
                .control-panel { padding: 15px 20px; border-bottom: 1px solid var(--border-color); }
                
                .premium-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 15px; }
                .premium-stat-card { background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 10px 15px; border-radius: 4px; display: flex; flex-direction: column; }
                .p-stat-value { font-size: 16px; font-weight: 700; color: var(--text-primary); }
                .p-stat-label { font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
                .offline .p-stat-value { color: var(--danger); }
                .traffic.tx .p-stat-value { color: var(--success); }
                .traffic.rx .p-stat-value { color: var(--info); }

                .search-tabs-row { display: flex; gap: 15px; align-items: center; }
                .modern-search-box { flex: 1; position: relative; display: flex; align-items: center; }
                .modern-search-box svg { position: absolute; left: 10px; color: var(--text-muted); }
                .modern-search-box input { width: 100%; padding: 8px 12px 8px 34px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; }
                
                .filter-tabs { display: flex; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; }
                .filter-tab { padding: 8px 15px; border: none; background: transparent; color: var(--text-secondary); font-size: 12px; font-weight: 600; cursor: pointer; border-right: 1px solid var(--border-color); }
                .filter-tab:last-child { border-right: none; }
                .filter-tab.active { background: var(--accent-primary); color: white; border-color: var(--accent-primary); }
                .filter-tab.online.active { background: var(--success); border-color: var(--success); }
                .filter-tab.offline.active { background: var(--danger); border-color: var(--danger); }

                .table-container { max-height: calc(100vh - 280px); overflow-y: auto; }
                .table { border-collapse: separate; border-spacing: 0; }
                .table thead th { position: sticky; top: 0; z-index: 10; background: var(--bg-tertiary); padding: 12px 15px; font-size: 11px; text-align: left; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color); }
                .table tbody td { padding: 12px 15px; border-bottom: 1px solid var(--border-color); font-size: 13px; vertical-align: middle; color: var(--text-primary); }
                .table tbody tr:hover { background: rgba(255,255,255,0.02); }
                
                .status-badge { padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: var(--bg-tertiary); color: var(--text-muted); }
                .status-badge.online { background: var(--success-bg); color: var(--success); }
                
                .u-name { font-weight: 600; color: var(--text-primary); display: block; }
                .profile-text { font-size: 12px; opacity: 0.95; font-weight: 500; }

                .btn-comment-simple { background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; padding: 6px; border-radius: 4px; transition: all 0.2s; }
                .btn-comment-simple:hover { background: var(--bg-tertiary); color: var(--text-primary); }
                .btn-comment-simple.active { color: var(--accent-primary); }

                .u-comment-inline {
                    font-size: 11px;
                    color: var(--text-muted);
                    font-style: italic;
                    max-width: 80px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .col-keterangan { width: 100px; }
                
                .ip-link { 
                    color: #3b82f6; 
                    text-decoration: none; 
                    cursor: pointer; 
                    transition: all 0.2s; 
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }
                .ip-link:hover { color: #2563eb; text-decoration: underline; }
                
                .flex { display: flex; }
                .items-center { align-items: center; }
                .gap-2 { gap: 8px; }
                .text-success { color: var(--success); }
                .text-info { color: var(--info); }
                .text-danger { color: var(--danger); }
                .traffic-cell { font-size: 11px; opacity: 0.7; font-weight: 400; }

                /* Mobile Card Styles */
                .user-cards-mobile { display: flex; flex-direction: column; gap: 12px; padding: 15px; }
                .mobile-user-card { 
                    background: var(--bg-secondary); 
                    border: 1px solid var(--border-color); 
                    border-radius: 8px; 
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    transition: transform 0.2s;
                    border-left: 3px solid var(--border-color);
                }
                .mobile-user-card.card-online { border-left-color: #22c55e; }
                .mobile-user-card.card-offline { border-left-color: #6b7280; }
                .mobile-user-card:active { transform: scale(0.98); }

                /* Mobile responsive header buttons */
                .header-controls { display: flex; gap: 8px; align-items: center; }
                @media (max-width: 768px) {
                    .header-controls .btn-label { display: none; }
                    .header-controls .btn { padding: 8px !important; min-width: unset; }
                    .header-controls { gap: 12px; }
                    .table-header-custom { flex-wrap: wrap; gap: 10px; padding: 10px 15px; }
                }
                
                .m-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
                .m-user-info { display: flex; align-items: center; gap: 10px; }
                .m-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #4b5563; }
                .m-status-dot.online { background: var(--success); box-shadow: 0 0 8px var(--success); }
                .m-user-name { font-weight: 700; font-size: 15px; color: var(--text-primary); }
                .m-note-text { font-size: 11px; color: var(--text-muted); font-style: italic; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                
                .m-card-details { display: flex; flex-direction: column; gap: 4px; }
                .m-detail-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); }
                .m-detail-val { color: var(--text-secondary); font-weight: 500; }
                
                .m-card-actions { 
                    display: flex; 
                    justify-content: flex-end; 
                    gap: 8px; 
                    margin-top: 8px; 
                    padding-top: 12px; 
                    border-top: 1px solid var(--border-color); 
                }
                
                .m-traffic-compact { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 6px 12px; 
                    background: var(--bg-tertiary); 
                    padding: 8px 12px; 
                    border-radius: 4px; 
                    margin-top: 4px;
                }
                .m-t-item { display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 4px; }
                .m-t-label { font-size: 8px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; min-width: 50px; }
                .m-t-value { font-size: 10px; font-weight: 500; color: var(--text-primary); }
                .traffic-cell { font-size: 11px; opacity: 0.7; font-weight: 400; }
                .traffic-stack { display: flex; flex-direction: column; align-items: flex-end; gap: 0; line-height: 1.2; }
                .t-speed { font-size: 11px; font-weight: 700; }
                .t-session { font-size: 9px; color: var(--text-muted); }
                .t-total { font-size: 11px; font-weight: 600; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 2px; padding-top: 2px; }
                
                .sortable-header { cursor: pointer; user-select: none; transition: background 0.2s; }
                .sortable-header:hover { background: rgba(255,255,255,0.03); }
                .sortable-header .opacity-30 { opacity: 0.3; }
                .text-primary { color: var(--accent-color, #7c3aed); }

                /* Loading State */
                .loading-state-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    height: 200px;
                    color: var(--text-muted);
                }
                .spinner-circle {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255,255,255,0.1);
                    border-radius: 50%;
                    border-top-color: var(--accent-primary);
                    animation: spin 1s ease-in-out infinite;
                    margin-bottom: 12px;
                }

                /* Pagination Styles */
                .pagination-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px 20px;
                    border-top: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .pagination-info { font-size: 13px; color: var(--text-muted); }
                .text-highlight { color: var(--text-primary); font-weight: 600; }
                .pagination-buttons { display: flex; align-items: center; gap: 8px; }
                .p-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .p-btn:hover:not(:disabled) {
                    background: var(--accent-primary);
                    color: white;
                    border-color: var(--accent-primary);
                }
                .p-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .page-indicator {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    min-width: 80px;
                    text-align: center;
                }

                @media (max-width: 600px) {
                    .pagination-controls { justify-content: center; }
                    .pagination-info { width: 100%; text-align: center; margin-bottom: 5px; }
                }
            `}</style>

            <PPPCreateModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                routerId={selectedRouter.id}
                onSuccess={() => { }}
            />

            <PPPUserCommentModal
                isOpen={commentModalOpen}
                onClose={() => setCommentModalOpen(false)}
                user={selectedUser}
            />

            <PPPIsolateModal
                isOpen={isolateModalOpen}
                onClose={() => setIsolateModalOpen(false)}
                user={selectedUser}
                isIsolated={selectedUser ? isUserIsolated(selectedUser) : false}
                onConfirm={handleConfirmIsolate}
            />

            <SimpleAlertModal
                isOpen={alertModalOpen}
                onClose={() => setAlertModalOpen(false)}
                title="Peringatan"
                message="Profile Isolir belum disetting di Router ini! Silakan atur di menu Router terlebih dahulu."
            />

            <PPPMapModal
                isOpen={mapModalOpen}
                onClose={() => setMapModalOpen(false)}
                routerId={selectedRouter.id}
                pppUsers={pppUsers}
            />

            <PPPCoordinateModal
                isOpen={coordModalOpen}
                onClose={() => setCoordModalOpen(false)}
                routerId={selectedRouter.id}
                user={selectedUser}
                allUsers={pppUsers}
                onSaved={handleCoordSaved}
            />
        </div>
    );
}
