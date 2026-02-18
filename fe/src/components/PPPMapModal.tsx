import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, MapPin, Loader2, Cable, GripVertical } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMapEvents, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routerApi } from '../api';
import type { PPPUser, MapData } from '../api';
import { toast } from '../store/toastStore';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Elegant user marker with gradient and glow
const createUserIcon = (isOnline: boolean) => {
    const color = isOnline ? '#22c55e' : '#6b7280';
    const glow = isOnline ? 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' : 'none';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 32 40" style="filter: ${glow}">
        <defs>
            <linearGradient id="pin-${isOnline ? 'on' : 'off'}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:${isOnline ? '#4ade80' : '#9ca3af'}"/>
                <stop offset="100%" style="stop-color:${color}"/>
            </linearGradient>
        </defs>
        <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="url(#pin-${isOnline ? 'on' : 'off'})" stroke="#fff" stroke-width="1.5"/>
        <circle cx="16" cy="14" r="6" fill="rgba(255,255,255,0.9)"/>
        <circle cx="16" cy="14" r="3" fill="${color}"/>
        ${isOnline ? '<circle cx="16" cy="14" r="3" fill="#22c55e"><animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/></circle>' : ''}
    </svg>`;
    return L.divIcon({
        html: svg,
        className: 'custom-map-icon',
        iconSize: [24, 30],
        iconAnchor: [12, 30],
        popupAnchor: [0, -30],
    });
};

// ODP marker
const createODPIcon = (selected = false) => {
    const baseColor = selected ? '#f59e0b' : '#2563eb';
    const lightColor = selected ? '#fbbf24' : '#60a5fa';
    const glowColor = selected ? 'rgba(245,158,11,0.5)' : 'rgba(59,130,246,0.4)';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 36 36" style="filter: drop-shadow(0 2px 4px ${glowColor})">
        <rect x="4" y="4" width="28" height="28" rx="6" fill="url(#odp-g-${selected ? 's' : 'n'})" stroke="${selected ? '#fbbf24' : '#fff'}" stroke-width="${selected ? '2.5' : '1.5'}"/>
        <defs>
            <linearGradient id="odp-g-${selected ? 's' : 'n'}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${lightColor}"/>
                <stop offset="100%" style="stop-color:${baseColor}"/>
            </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="5" fill="rgba(255,255,255,0.9)"/>
        <circle cx="18" cy="18" r="2.5" fill="${baseColor}"/>
        <path d="M12 10a8.5 8.5 0 0 1 12 0" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M14 12.5a5.5 5.5 0 0 1 8 0" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>`;
    return L.divIcon({ html: svg, className: 'custom-map-icon', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
};

// Waypoint marker (small draggable diamond)
const waypointIcon = L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4))">
        <rect x="3" y="3" width="10" height="10" rx="2" transform="rotate(45 8 8)" fill="#f59e0b" stroke="#fff" stroke-width="1.5"/>
    </svg>`,
    className: 'custom-map-icon waypoint-icon',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

const onlineIcon = createUserIcon(true);
const offlineIcon = createUserIcon(false);
const odpIcon = createODPIcon(false);
const odpSelectedIcon = createODPIcon(true);

// Animated cable for user-to-ODP
function UserCablePolyline({ positions, isOnline }: { positions: [number, number][]; isOnline: boolean }) {
    const polylineRef = useRef<L.Polyline>(null);
    useEffect(() => {
        if (polylineRef.current) {
            const el = polylineRef.current.getElement();
            if (el) {
                el.classList.toggle('cable-online', isOnline);
                el.classList.toggle('cable-offline', !isOnline);
            }
        }
    });
    return (
        <>
            {isOnline && (
                <Polyline positions={positions} pathOptions={{ color: '#22c55e', weight: 8, opacity: 0.15 }} />
            )}
            <Polyline
                ref={polylineRef}
                positions={positions}
                pathOptions={{
                    color: isOnline ? '#22c55e' : '#4b5563',
                    weight: isOnline ? 3 : 1.5,
                    opacity: isOnline ? 0.85 : 0.35,
                    dashArray: isOnline ? '10 6' : '4 8',
                    lineCap: 'round',
                    lineJoin: 'round',
                }}
            />
        </>
    );
}

function FitBounds({ markers }: { markers: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (markers.length > 0) {
            const bounds = L.latLngBounds(markers.map(m => L.latLng(m[0], m[1])));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
    }, [markers, map]);
    return null;
}

// Helper: parse waypoints from JSON string
function parseWaypoints(wps: string | null): [number, number][] {
    if (!wps) return [];
    try { return JSON.parse(wps); } catch { return []; }
}

interface PPPMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    routerId?: string;
    pppUsers?: PPPUser[];
}

type MapMode = 'view' | 'add-odp' | 'draw-cable';

export function PPPMapModal({ isOpen, onClose, routerId, pppUsers = [] }: PPPMapModalProps) {
    const isGlobal = !routerId;
    const [mapData, setMapData] = useState<MapData | null>(null);
    const [loading, setLoading] = useState(false);
    const [mapMode, setMapMode] = useState<MapMode>('view');

    // ODP add mode
    const [odpName, setOdpName] = useState('');
    const [clickLatLng, setClickLatLng] = useState<[number, number] | null>(null);
    const [savingODP, setSavingODP] = useState(false);

    // Cable drawing state
    const [cableFromOdpId, setCableFromOdpId] = useState<string | null>(null);
    const [cableWaypoints, setCableWaypoints] = useState<[number, number][]>([]);
    const [savingCable, setSavingCable] = useState(false);

    // Cable editing state (for existing cable waypoints editing)
    const [editingCableId, setEditingCableId] = useState<string | null>(null);
    const [editWaypoints, setEditWaypoints] = useState<[number, number][]>([]);
    const [savingEditWaypoints, setSavingEditWaypoints] = useState(false);

    const fetchMapData = useCallback(async () => {
        if (!isOpen) return;
        setLoading(true);
        try {
            let data: MapData;
            if (isGlobal) {
                const res = await routerApi.getAllMapData();
                data = res.data;
            } else {
                if (!routerId) return;
                const res = await routerApi.getMapData(routerId);
                data = res.data;
            }
            setMapData(data);
        } catch (error) {
            console.error('Failed to load map data', error);
            toast.error('Gagal memuat data peta');
        } finally {
            setLoading(false);
        }
    }, [isOpen, routerId, isGlobal]);

    useEffect(() => {
        if (isOpen) {
            fetchMapData();
        }
    }, [isOpen, fetchMapData]);

    const resetMode = () => {
        setMapMode('view');
        setOdpName('');
        setClickLatLng(null);
        setCableFromOdpId(null);
        setCableWaypoints([]);
        setEditingCableId(null);
        setEditWaypoints([]);
    };

    // ==================== ODP CRUD ====================
    const handleCreateODP = async () => {
        if (!clickLatLng || !odpName.trim() || !routerId) return;
        setSavingODP(true);
        try {
            await routerApi.createODP(routerId, {
                name: odpName.trim(),
                latitude: clickLatLng[0],
                longitude: clickLatLng[1],
            });
            toast.success(`ODP "${odpName.trim()}" berhasil ditambahkan`);
            resetMode();
            await fetchMapData();
        } catch (e) {
            console.error(e);
            toast.error('Gagal menambahkan ODP');
        } finally {
            setSavingODP(false);
        }
    };

    const handleDeleteODP = async (odpId: string, name: string) => {
        if (!routerId) return;
        try {
            await routerApi.deleteODP(routerId, odpId);
            toast.success(`ODP "${name}" berhasil dihapus`);
            await fetchMapData();
        } catch (e) {
            console.error(e);
            toast.error('Gagal menghapus ODP');
        }
    };

    // ==================== CABLE DRAW (create new cable with waypoints) ====================
    const handleODPClickForCable = async (odpId: string) => {
        if (mapMode !== 'draw-cable' || !routerId) return;

        if (!cableFromOdpId) {
            setCableFromOdpId(odpId);
            setCableWaypoints([]);
            toast.info('Klik peta untuk titik belokan, lalu klik ODP tujuan');
        } else if (cableFromOdpId === odpId) {
            setCableFromOdpId(null);
            setCableWaypoints([]);
        } else {
            // Finish cable
            setSavingCable(true);
            try {
                await routerApi.createODPCable(routerId, {
                    fromOdpId: cableFromOdpId,
                    toOdpId: odpId,
                    waypoints: cableWaypoints.length > 0 ? cableWaypoints : undefined,
                });
                toast.success('Kabel antar ODP berhasil ditambahkan');
                setCableFromOdpId(null);
                setCableWaypoints([]);
                await fetchMapData();
            } catch (e) {
                console.error(e);
                toast.error('Gagal menambahkan kabel');
            } finally {
                setSavingCable(false);
            }
        }
    };

    // ==================== CABLE EDIT (waypoints on existing cable) ====================
    const handleStartEditCable = (cableId: string) => {
        if (editingCableId === cableId) {
            // Toggle off
            setEditingCableId(null);
            setEditWaypoints([]);
            return;
        }
        const cable = mapData?.odpCables.find(c => c.id === cableId);
        if (!cable) return;
        setEditingCableId(cableId);
        setEditWaypoints(parseWaypoints(cable.waypoints));
        setMapMode('view'); // exit other modes
    };

    const handleSaveEditWaypoints = async () => {
        if (!editingCableId || !routerId) return;
        setSavingEditWaypoints(true);
        try {
            await routerApi.updateODPCableWaypoints(routerId, editingCableId, editWaypoints);
            toast.success('Belokan kabel berhasil disimpan');
            setEditingCableId(null);
            setEditWaypoints([]);
            await fetchMapData();
        } catch (e) {
            console.error(e);
            toast.error('Gagal menyimpan belokan');
        } finally {
            setSavingEditWaypoints(false);
        }
    };

    const handleDeleteODPCable = async (cableId: string) => {
        if (!routerId) return;
        try {
            await routerApi.deleteODPCable(routerId, cableId);
            toast.success('Kabel berhasil dihapus');
            if (editingCableId === cableId) {
                setEditingCableId(null);
                setEditWaypoints([]);
            }
            await fetchMapData();
        } catch (e) {
            console.error(e);
            toast.error('Gagal menghapus kabel');
        }
    };

    // ==================== Map click handler ====================
    function MapClickHandler() {
        useMapEvents({
            click(e) {
                if (mapMode === 'add-odp') {
                    setClickLatLng([e.latlng.lat, e.latlng.lng]);
                } else if (mapMode === 'draw-cable' && cableFromOdpId) {
                    // Add waypoint
                    setCableWaypoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
                } else if (editingCableId) {
                    // Add waypoint to existing cable being edited
                    setEditWaypoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
                }
            }
        });
        return null;
    }

    // ==================== Derived data ====================
    const enrichedUsers = mapData?.users.map(mu => {
        // Try to find full user data props, fall back to API map data
        const pppUser = pppUsers.find(u => u.name === mu.secretName) || {
            name: mu.secretName,
            isOnline: mu.isOnline,
            service: 'N/A',
            profile: 'N/A',
            id: mu.id,
            comment: mu.comment || '',
        } as PPPUser;
        return { ...mu, pppUser };
    }) || [];

    // user-to-ODP cables
    const userCables: { positions: [number, number][]; isOnline: boolean }[] = [];
    if (mapData) {
        for (const user of mapData.users) {
            if (user.latitude && user.longitude && user.odpId) {
                const odp = mapData.odps.find(o => o.id === user.odpId);
                if (odp) {
                    userCables.push({
                        positions: [[odp.latitude, odp.longitude], [user.latitude, user.longitude]],
                        isOnline: user.isOnline,
                    });
                }
            }
        }
    }

    // ODP-to-ODP cables with waypoints
    const odpCableLines: { id: string; positions: [number, number][]; label: string | null; fromName: string; toName: string }[] = [];
    if (mapData) {
        for (const cable of mapData.odpCables) {
            const fromOdp = mapData.odps.find(o => o.id === cable.fromOdpId);
            const toOdp = mapData.odps.find(o => o.id === cable.toOdpId);
            if (fromOdp && toOdp) {
                const waypoints = parseWaypoints(cable.waypoints);
                const positions: [number, number][] = [
                    [fromOdp.latitude, fromOdp.longitude],
                    ...waypoints,
                    [toOdp.latitude, toOdp.longitude],
                ];
                odpCableLines.push({
                    id: cable.id,
                    positions,
                    label: cable.label,
                    fromName: fromOdp.name,
                    toName: toOdp.name,
                });
            }
        }
    }

    // Helper to get Router Name
    const getRouterName = (rId?: string) => {
        if (!mapData?.routers) return '';
        const r = mapData.routers.find(rt => rt.id === rId);
        return r ? `(${r.name})` : '';
    };



    // Cable preview during drawing
    const cablePreviewPositions: [number, number][] = [];
    if (mapMode === 'draw-cable' && cableFromOdpId && mapData) {
        const fromOdp = mapData.odps.find(o => o.id === cableFromOdpId);
        if (fromOdp) {
            cablePreviewPositions.push([fromOdp.latitude, fromOdp.longitude], ...cableWaypoints);
        }
    }

    // All positions for fitting bounds
    const allPositions: [number, number][] = [];
    mapData?.users.forEach(u => { if (u.latitude && u.longitude) allPositions.push([u.latitude, u.longitude]); });
    mapData?.odps.forEach(o => allPositions.push([o.latitude, o.longitude]));

    const defaultCenter: [number, number] = allPositions.length > 0 ? allPositions[0] : [-6.2, 106.8];
    const getODPName = (id: string) => mapData?.odps.find(o => o.id === id)?.name || '?';

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" style={{ zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="map-modal-container">
                {/* ==================== HEADER ==================== */}
                <div className="map-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="map-header-icon"><MapPin size={16} /></div>
                        <span style={{ fontWeight: 700, fontSize: '15px' }}>Network Map</span>
                        <div className="map-stats-badges">
                            <span className="map-stat-badge users">{enrichedUsers.length} titik</span>
                            <span className="map-stat-badge odps">{mapData?.odps.length || 0} ODP</span>
                            <span className="map-stat-badge cables">{userCables.length + odpCableLines.length} kabel</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {!isGlobal && (
                            <>
                                <button
                                    className={`btn ${mapMode === 'add-odp' ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                                    onClick={() => { resetMode(); if (mapMode !== 'add-odp') setMapMode('add-odp'); }}
                                    style={{ fontSize: '12px' }}
                                >
                                    <Plus size={14} />
                                    {mapMode === 'add-odp' ? 'Batal' : 'Tambah ODP'}
                                </button>
                                <button
                                    className={`btn ${mapMode === 'draw-cable' ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                                    onClick={() => { resetMode(); if (mapMode !== 'draw-cable') setMapMode('draw-cable'); }}
                                    style={{ fontSize: '12px', background: mapMode !== 'draw-cable' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : undefined }}
                                >
                                    <Cable size={14} />
                                    {mapMode === 'draw-cable' ? 'Batal' : 'Tarik Kabel'}
                                </button>
                            </>
                        )}
                    </div>
                    <button className="map-close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                {/* ==================== INSTRUCTION BARS ==================== */}
                {mapMode === 'add-odp' && (
                    <div className="form-bar">
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {clickLatLng ? `📍 ${clickLatLng[0].toFixed(6)}, ${clickLatLng[1].toFixed(6)}` : '👆 Klik peta untuk pilih lokasi ODP'}
                        </span>
                        <input
                            type="text" className="input" placeholder="Nama ODP (misal: ODP-01)"
                            value={odpName} onChange={e => setOdpName(e.target.value)}
                            style={{ width: '200px', padding: '6px 10px', fontSize: '12px' }}
                        />
                        <button className="btn btn-primary btn-sm" disabled={!clickLatLng || !odpName.trim() || savingODP}
                            onClick={handleCreateODP} style={{ fontSize: '12px' }}>
                            {savingODP ? <Loader2 size={14} className="spinning" /> : 'Simpan ODP'}
                        </button>
                    </div>
                )}

                {mapMode === 'draw-cable' && (
                    <div className="form-bar" style={{ background: 'rgba(245,158,11,0.08)' }}>
                        <Cable size={16} style={{ color: '#f59e0b' }} />
                        <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                            {savingCable ? 'Menyimpan...' :
                                !cableFromOdpId ? '1️⃣ Klik ODP asal' :
                                    `✅ ${getODPName(cableFromOdpId)} → Klik peta untuk belokan (${cableWaypoints.length} titik), lalu klik ODP tujuan`}
                        </span>
                        {cableWaypoints.length > 0 && (
                            <button className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}
                                onClick={() => setCableWaypoints(prev => prev.slice(0, -1))}>
                                Undo belokan
                            </button>
                        )}
                    </div>
                )}

                {editingCableId && mapMode === 'view' && (
                    <div className="form-bar" style={{ background: 'rgba(59,130,246,0.08)' }}>
                        <GripVertical size={16} style={{ color: '#3b82f6' }} />
                        <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>
                            ✏️ Edit belokan kabel — klik peta untuk tambah titik ({editWaypoints.length} titik). Drag titik untuk pindahkan.
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {editWaypoints.length > 0 && (
                                <button className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}
                                    onClick={() => setEditWaypoints(prev => prev.slice(0, -1))}>
                                    Undo
                                </button>
                            )}
                            <button className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}
                                onClick={() => setEditWaypoints([])}>
                                Reset
                            </button>
                            <button className="btn btn-primary btn-sm" style={{ fontSize: '11px' }}
                                disabled={savingEditWaypoints} onClick={handleSaveEditWaypoints}>
                                {savingEditWaypoints ? <Loader2 size={14} className="spinning" /> : 'Simpan'}
                            </button>
                            <button className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}
                                onClick={() => { setEditingCableId(null); setEditWaypoints([]); }}>
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                {/* ==================== MAP ==================== */}
                <div className="map-modal-body">
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                            <Loader2 size={24} className="spinning" style={{ marginRight: '10px' }} /> Memuat peta...
                        </div>
                    ) : (

                        <MapContainer center={defaultCenter} zoom={15} style={{ height: '100%', width: '100%', borderRadius: '0 0 8px 8px' }}>
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer checked name="Street">
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer name="Satellite">
                                    <TileLayer
                                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    />
                                </LayersControl.BaseLayer>
                            </LayersControl>
                            <MapClickHandler />
                            {allPositions.length > 1 && <FitBounds markers={allPositions} />}

                            {/* ===== ODP-to-ODP Cables ===== */}
                            {odpCableLines.map(cable => {
                                const isEditing = editingCableId === cable.id;
                                // If editing this cable, show the live edit positions instead
                                const displayPositions = isEditing
                                    ? (() => {
                                        const fromOdp = mapData?.odps.find(o => o.id === mapData.odpCables.find(c => c.id === cable.id)?.fromOdpId);
                                        const toOdp = mapData?.odps.find(o => o.id === mapData.odpCables.find(c => c.id === cable.id)?.toOdpId);
                                        if (!fromOdp || !toOdp) return cable.positions;
                                        return [[fromOdp.latitude, fromOdp.longitude] as [number, number], ...editWaypoints, [toOdp.latitude, toOdp.longitude] as [number, number]];
                                    })()
                                    : cable.positions;

                                return (
                                    <React.Fragment key={`odp-cable-${cable.id}`}>
                                        {/* Glow */}
                                        <Polyline positions={displayPositions}
                                            pathOptions={{ color: isEditing ? '#f59e0b' : '#3b82f6', weight: 10, opacity: 0.12, interactive: false }} />

                                        {/* Main visible line */}
                                        <Polyline positions={displayPositions}
                                            pathOptions={{
                                                color: isEditing ? '#f59e0b' : '#60a5fa',
                                                weight: isEditing ? 4 : 3.5,
                                                opacity: 0.85,
                                                dashArray: '12 4',
                                                lineCap: 'round',
                                                interactive: false, // Visual only, hit area handles clicks
                                            }}
                                        />

                                        {/* Invisible Hit Area (Thicker for easier clicking) */}
                                        <Polyline
                                            positions={displayPositions}
                                            pathOptions={{ stroke: true, weight: 25, opacity: 0 }}
                                            eventHandlers={{
                                                click: (e) => {
                                                    // Ensure popup opens and doesn't get blocked
                                                    if (isEditing) L.DomEvent.stopPropagation(e);
                                                }
                                            }}
                                        >
                                            {!editingCableId && (
                                                <Popup>
                                                    <div className="map-popup-content">
                                                        <div className="map-popup-title">🔌 {cable.fromName} ↔ {cable.toName}</div>
                                                        <div className="map-popup-row"><span>Belokan</span><span>{parseWaypoints(mapData?.odpCables.find(c => c.id === cable.id)?.waypoints || null).length} titik</span></div>
                                                        {!isGlobal && (
                                                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                                                <button className="map-popup-action edit" onClick={() => handleStartEditCable(cable.id)}>
                                                                    <GripVertical size={12} /> Edit Belokan
                                                                </button>
                                                                <button className="map-popup-action delete" onClick={() => handleDeleteODPCable(cable.id)}>
                                                                    <Trash2 size={12} /> Hapus
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Popup>
                                            )}
                                        </Polyline>

                                        {/* Waypoint drag markers (only when editing this cable) */}
                                        {isEditing && editWaypoints.map((wp, idx) => (
                                            <Marker
                                                key={`edit-wp-${idx}`}
                                                position={wp}
                                                icon={waypointIcon}
                                                draggable
                                                eventHandlers={{
                                                    dragend: (e) => {
                                                        const latlng = e.target.getLatLng();
                                                        setEditWaypoints(prev => {
                                                            const next = [...prev];
                                                            next[idx] = [latlng.lat, latlng.lng];
                                                            return next;
                                                        });
                                                    },
                                                    dblclick: () => {
                                                        // Double-click to remove waypoint
                                                        setEditWaypoints(prev => prev.filter((_, i) => i !== idx));
                                                    },
                                                }}
                                            >
                                                <Tooltip direction="right" offset={[10, 0]} className="map-name-tooltip">
                                                    Titik {idx + 1} (drag / dbl-click hapus)
                                                </Tooltip>
                                            </Marker>
                                        ))}
                                    </React.Fragment>
                                );
                            })}

                            {/* ===== Cable Preview while drawing ===== */}
                            {cablePreviewPositions.length > 0 && (
                                <>
                                    <Polyline positions={cablePreviewPositions}
                                        pathOptions={{ color: '#f59e0b', weight: 3, opacity: 0.7, dashArray: '8 6', lineCap: 'round' }} />
                                    {/* Show waypoint markers during drawing */}
                                    {cableWaypoints.map((wp, idx) => (
                                        <Marker key={`draw-wp-${idx}`} position={wp} icon={waypointIcon}>
                                            <Tooltip direction="right" offset={[10, 0]} className="map-name-tooltip">
                                                Belokan {idx + 1}
                                            </Tooltip>
                                        </Marker>
                                    ))}
                                </>
                            )}

                            {/* ===== User-to-ODP Cables ===== */}
                            {userCables.map((cable, i) => (
                                <UserCablePolyline key={`ucable-${i}`} positions={cable.positions} isOnline={cable.isOnline} />
                            ))}

                            {/* ===== ODP Markers ===== */}
                            {mapData?.odps.map(odp => {
                                const isSelected = (mapMode === 'draw-cable' && cableFromOdpId === odp.id);
                                return (
                                    <Marker key={`odp-${odp.id}`} position={[odp.latitude, odp.longitude]}
                                        icon={isSelected ? odpSelectedIcon : odpIcon}
                                        eventHandlers={{
                                            click: () => {
                                                if (mapMode === 'draw-cable') handleODPClickForCable(odp.id);
                                            }
                                        }}>
                                        <Tooltip permanent direction="top" offset={[0, -18]} className="map-name-tooltip odp">
                                            {odp.name}
                                        </Tooltip>
                                        {mapMode !== 'draw-cable' && (
                                            <Popup>
                                                <div className="map-popup-content">
                                                    <div className="map-popup-title">📦 ODP: {odp.name} {isGlobal && <span style={{ fontSize: '10px', color: '#9ca3af' }}>{getRouterName(odp.routerId)}</span>}</div>
                                                    <div className="map-popup-row"><span>Koordinat</span><span>{odp.latitude.toFixed(6)}, {odp.longitude.toFixed(6)}</span></div>
                                                    {!isGlobal && (
                                                        <button className="map-popup-action delete" onClick={() => handleDeleteODP(odp.id, odp.name)}>
                                                            <Trash2 size={12} /> Hapus ODP
                                                        </button>
                                                    )}
                                                </div>
                                            </Popup>
                                        )}
                                    </Marker>
                                );
                            })}

                            {/* ===== User Markers ===== */}
                            {enrichedUsers.map(eu => {
                                if (!eu.latitude || !eu.longitude) return null;
                                const pu = eu.pppUser;
                                return (
                                    <Marker key={`user-${eu.id}`} position={[eu.latitude, eu.longitude]}
                                        icon={eu.isOnline ? onlineIcon : offlineIcon}>
                                        <Tooltip permanent direction="top" offset={[0, -40]} className={`map-name-tooltip ${eu.isOnline ? 'online' : 'offline'}`}>
                                            {eu.secretName}
                                        </Tooltip>
                                        <Popup>
                                            <div className="map-popup-content">
                                                <div className="map-popup-title" style={{ color: eu.isOnline ? '#22c55e' : '#6b7280' }}>
                                                    {eu.isOnline ? '🟢' : '⚫'} {eu.secretName}
                                                    {isGlobal && eu.routerId && (
                                                        <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 'normal', marginTop: '2px' }}>
                                                            {getRouterName(eu.routerId)}
                                                        </div>
                                                    )}
                                                </div>
                                                {pu && (
                                                    <>
                                                        <div className="map-popup-row"><span>Profile</span><span>{pu.profile}</span></div>
                                                        <div className="map-popup-row"><span>IP</span><span>{pu.address || '-'}</span></div>
                                                        <div className="map-popup-row"><span>Uptime</span><span>{pu.uptime || '-'}</span></div>
                                                        {pu.comment && <div className="map-popup-row"><span>Note</span><span>{pu.comment}</span></div>}
                                                    </>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}

                            {/* Click Marker for ODP placement */}
                            {mapMode === 'add-odp' && clickLatLng && (
                                <Marker position={clickLatLng} icon={odpIcon}>
                                    <Popup>Lokasi ODP Baru</Popup>
                                </Marker>
                            )}
                        </MapContainer>
                    )}
                </div>
            </div>

            <style>{`
                .map-modal-container {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    width: 95vw;
                    max-width: 1200px;
                    height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
                    position: relative;
                }
                .map-modal-header {
                    padding: 18px 20px;
                    padding-right: 60px; /* More space for close button */
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--border-color);
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .map-header-icon {
                    width: 32px; height: 32px; border-radius: 8px;
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    display: flex; align-items: center; justify-content: center; color: #fff;
                }
                .map-stats-badges { display: flex; gap: 6px; }
                .map-stat-badge {
                    font-size: 10px; font-weight: 600; padding: 2px 8px;
                    border-radius: 99px; background: rgba(255,255,255,0.06); color: var(--text-muted);
                }
                .map-stat-badge.users { color: #22c55e; background: rgba(34,197,94,0.1); }
                .map-stat-badge.odps { color: #3b82f6; background: rgba(59,130,246,0.1); }
                .map-stat-badge.cables { color: #f59e0b; background: rgba(245,158,11,0.1); }
                .map-modal-body { flex: 1; overflow: hidden; }
                .form-bar {
                    padding: 10px 20px; display: flex; align-items: center; gap: 12px;
                    background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);
                    flex-wrap: wrap;
                }
                .custom-map-icon { background: transparent !important; border: none !important; }
                .waypoint-icon { cursor: grab !important; }
                .waypoint-icon:active { cursor: grabbing !important; }
                .map-close-btn {
                    position: absolute;
                    top: 18px;
                    right: 20px;
                    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 6px; padding: 6px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    color: var(--text-muted); transition: all 0.2s;
                    z-index: 10;
                }
                .map-close-btn:hover {
                    background: rgba(239,68,68,0.15); color: #ef4444; border-color: rgba(239,68,68,0.3);
                }

                /* Tooltips */
                .map-name-tooltip {
                    background: rgba(15, 23, 42, 0.88) !important;
                    border: 1px solid rgba(255,255,255,0.15) !important;
                    border-radius: 4px !important; color: #fff !important;
                    font-size: 10px !important; font-weight: 600 !important;
                    padding: 2px 7px !important; box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
                    white-space: nowrap !important; letter-spacing: 0.2px !important;
                }
                .map-name-tooltip::before { border-top-color: rgba(15, 23, 42, 0.88) !important; }
                .map-name-tooltip.online { background: rgba(34, 197, 94, 0.85) !important; border-color: rgba(34, 197, 94, 0.5) !important; }
                .map-name-tooltip.online::before { border-top-color: rgba(34, 197, 94, 0.85) !important; }
                .map-name-tooltip.offline { background: rgba(75, 85, 99, 0.75) !important; border-color: rgba(75, 85, 99, 0.4) !important; opacity: 0.7; }
                .map-name-tooltip.offline::before { border-top-color: rgba(75, 85, 99, 0.75) !important; }
                .map-name-tooltip.odp { background: rgba(37, 99, 235, 0.85) !important; border-color: rgba(59, 130, 246, 0.5) !important; }
                .map-name-tooltip.odp::before { border-top-color: rgba(37, 99, 235, 0.85) !important; }

                /* Popup */
                .map-popup-content { font-family: inherit; min-width: 180px; }
                .map-popup-title {
                    font-weight: 700; font-size: 14px; margin-bottom: 8px;
                    padding-bottom: 6px; border-bottom: 1px solid #e5e7eb;
                }
                .map-popup-row {
                    display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; gap: 12px;
                }
                .map-popup-row span:first-child { color: #6b7280; font-weight: 600; }
                .map-popup-row span:last-child { color: #111827; font-weight: 500; }
                .map-popup-action {
                    margin-top: 4px; display: flex; align-items: center; gap: 4px;
                    font-size: 11px; border-radius: 4px; padding: 4px 8px;
                    cursor: pointer; flex: 1; justify-content: center; transition: background 0.15s;
                    font-weight: 600;
                }
                .map-popup-action.delete {
                    color: #ef4444; background: #fef2f2; border: 1px solid #fecaca;
                }
                .map-popup-action.delete:hover { background: #fee2e2; }
                .map-popup-action.edit {
                    color: #3b82f6; background: #eff6ff; border: 1px solid #bfdbfe;
                }
                .map-popup-action.edit:hover { background: #dbeafe; }

                /* Cable Animation */
                .cable-online { animation: cable-flow 1.2s linear infinite; }
                .cable-offline { stroke-dasharray: 4 8; }
                @keyframes cable-flow { to { stroke-dashoffset: -32; } }
                .leaflet-container { font-family: inherit; }
            `}</style>
        </div >,
        document.body
    );
}
