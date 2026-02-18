import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Save, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routerApi } from '../api';
import type { PPPUser } from '../api';
import { toast } from '../store/toastStore';

// Fix icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = (color: string) => L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="${color}" stroke="#fff" stroke-width="1.5"/></svg>`,
    className: 'custom-map-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
});

const odpIconSmall = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6" stroke="#fff" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4" fill="#fff"/><circle cx="12" cy="12" r="2" fill="#3b82f6"/></svg>`,
    className: 'custom-map-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

const otherUserIcon = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#9ca3af" stroke="#fff" stroke-width="1"/></svg>`,
    className: 'custom-map-icon',
    iconSize: [18, 18],
    iconAnchor: [9, 18],
});

function RecenterMap({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 17);
    }, [center, map]);
    return null;
}

interface PPPCoordinateModalProps {
    isOpen: boolean;
    onClose: () => void;
    routerId: string;
    user: PPPUser | null;
    allUsers: PPPUser[];
    onSaved: () => void;
}

export function PPPCoordinateModal({ isOpen, onClose, routerId, user, allUsers, onSaved }: PPPCoordinateModalProps) {
    const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
    const [odps, setOdps] = useState<{ id: string; name: string; latitude: number; longitude: number }[]>([]);
    const [selectedOdp, setSelectedOdp] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchODPs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await routerApi.getODPs(routerId);
            setOdps(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [routerId]);

    useEffect(() => {
        if (isOpen && user) {
            fetchODPs();
            if (user.latitude && user.longitude) {
                setSelectedPos([user.latitude, user.longitude]);
            } else {
                setSelectedPos(null);
            }
            setSelectedOdp(user.odpId || '');
        }
    }, [isOpen, user, fetchODPs]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await routerApi.updateUserCoordinates(routerId, user.name, {
                latitude: selectedPos?.[0] ?? null,
                longitude: selectedPos?.[1] ?? null,
                odpId: selectedOdp || null,
            });
            toast.success(`Koordinat ${user.name} berhasil disimpan`);
            onSaved();
            onClose();
        } catch (e) {
            console.error('Failed to save coordinates', e);
            toast.error('Gagal menyimpan koordinat');
        } finally {
            setSaving(false);
        }
    };

    const handleClear = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await routerApi.updateUserCoordinates(routerId, user.name, {
                latitude: null,
                longitude: null,
                odpId: null,
            });
            setSelectedPos(null);
            setSelectedOdp('');
            toast.success(`Koordinat ${user.name} berhasil dihapus`);
            onSaved();
            onClose();
        } catch (e) {
            console.error('Failed to clear coordinates', e);
            toast.error('Gagal menghapus koordinat');
        } finally {
            setSaving(false);
        }
    };

    function ClickHandler() {
        useMapEvents({
            click(e) {
                setSelectedPos([e.latlng.lat, e.latlng.lng]);
            }
        });
        return null;
    }

    // Other users with coordinates (for context on the map)
    const otherMarkedUsers = allUsers.filter(u => u.name !== user?.name && u.latitude && u.longitude);

    // Default center
    const center: [number, number] = selectedPos
        || (user?.latitude && user?.longitude ? [user.latitude, user.longitude] : null)
        || (otherMarkedUsers.length > 0 ? [otherMarkedUsers[0].latitude!, otherMarkedUsers[0].longitude!] : null)
        || [-6.2, 106.8];

    if (!isOpen || !user) return null;

    return createPortal(
        <div className="modal-overlay" style={{ zIndex: 10001, backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="coord-modal-container">
                <div className="coord-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MapPin size={18} style={{ color: '#f59e0b' }} />
                        <span style={{ fontWeight: 700, fontSize: '15px' }}>Set Koordinat: {user.name}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="map-close-btn"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="coord-form-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                                type="number"
                                className="input"
                                placeholder="Lat"
                                value={selectedPos ? selectedPos[0] : ''}
                                onChange={e => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) setSelectedPos(prev => [val, prev ? prev[1] : 0]);
                                }}
                                style={{ width: '100px', padding: '6px 10px', fontSize: '12px' }}
                            />
                            <input
                                type="number"
                                className="input"
                                placeholder="Lng"
                                value={selectedPos ? selectedPos[1] : ''}
                                onChange={e => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) setSelectedPos(prev => [prev ? prev[0] : 0, val]);
                                }}
                                style={{ width: '100px', padding: '6px 10px', fontSize: '12px' }}
                            />
                        </div>
                        <select
                            className="input"
                            value={selectedOdp}
                            onChange={e => setSelectedOdp(e.target.value)}
                            style={{ width: '200px', padding: '6px 10px', fontSize: '12px' }}
                        >
                            <option value="">-- Pilih ODP --</option>
                            {odps.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {(user.latitude || selectedPos) && (
                            <button className="btn btn-secondary btn-sm" onClick={handleClear} disabled={saving} style={{ fontSize: '12px' }}>
                                Hapus Koordinat
                            </button>
                        )}
                        <button
                            className="btn btn-primary btn-sm"
                            disabled={!selectedPos || saving}
                            onClick={handleSave}
                            style={{ fontSize: '12px' }}
                        >
                            {saving ? <Loader2 size={14} className="spinning" /> : <><Save size={14} /> Simpan</>}
                        </button>
                    </div>
                </div>

                <div className="coord-modal-body">
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                            <Loader2 size={24} className="spinning" style={{ marginRight: '10px' }} />
                            Memuat...
                        </div>
                    ) : (
                        <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%', borderRadius: '0 0 8px 8px' }}>
                            <TileLayer
                                attribution='&copy; OSM'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <ClickHandler />
                            {selectedPos && <RecenterMap center={selectedPos} />}

                            {/* The user's selected/current position */}
                            {selectedPos && (
                                <Marker position={selectedPos} icon={userIcon('#ef4444')}>
                                    <Tooltip permanent direction="top" offset={[0, -28]} className="map-name-tooltip">
                                        {user.name}
                                    </Tooltip>
                                </Marker>
                            )}

                            {/* Other users' markers for context */}
                            {otherMarkedUsers.map(u => (
                                <Marker key={u.name} position={[u.latitude!, u.longitude!]} icon={otherUserIcon}>
                                    <Tooltip permanent direction="top" offset={[0, -18]} className="map-name-tooltip muted">
                                        {u.name}
                                    </Tooltip>
                                </Marker>
                            ))}

                            {/* ODP markers */}
                            {odps.map(o => (
                                <Marker key={o.id} position={[o.latitude, o.longitude]} icon={odpIconSmall}>
                                    <Tooltip permanent direction="top" offset={[0, -10]} className="map-name-tooltip odp">
                                        {o.name}
                                    </Tooltip>
                                </Marker>
                            ))}
                        </MapContainer>
                    )}
                </div>
            </div>

            <style>{`
                .coord-modal-container {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    width: 90vw;
                    max-width: 900px;
                    height: 75vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
                }
                .coord-modal-header {
                    padding: 14px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--border-color);
                }
                .coord-form-bar {
                    padding: 10px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: var(--bg-tertiary);
                    border-bottom: 1px solid var(--border-color);
                    flex-wrap: wrap;
                }
                .coord-modal-body {
                    flex: 1;
                    overflow: hidden;
                }
                .custom-map-icon {
                    background: transparent !important;
                    border: none !important;
                }
                .map-close-btn {
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 6px;
                    padding: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    transition: all 0.2s;
                }
                .map-close-btn:hover {
                    background: rgba(239,68,68,0.15);
                    color: #ef4444;
                    border-color: rgba(239,68,68,0.3);
                }
                .map-name-tooltip {
                    background: rgba(15, 23, 42, 0.85) !important;
                    border: 1px solid rgba(255,255,255,0.15) !important;
                    border-radius: 4px !important;
                    color: #fff !important;
                    font-size: 10px !important;
                    font-weight: 600 !important;
                    padding: 2px 6px !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
                    white-space: nowrap !important;
                }
                .map-name-tooltip::before {
                    border-top-color: rgba(15, 23, 42, 0.85) !important;
                }
                .map-name-tooltip.muted {
                    opacity: 0.6;
                }
                .map-name-tooltip.odp {
                    background: rgba(59, 130, 246, 0.85) !important;
                }
                .map-name-tooltip.odp::before {
                    border-top-color: rgba(59, 130, 246, 0.85) !important;
                }
            `}</style>
        </div>,
        document.body
    );
}
