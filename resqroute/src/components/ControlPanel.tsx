'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ControlPanelProps {
  userLat: number | null;
  userLng: number | null;
  userRole: string;
  onDisaster: () => void;
  onAccident: () => void;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
  onRouteFound?: (path: Array<{ lat: number; lng: number }>, info: { distance: string; duration: string }) => void;
  onClearRoute?: () => void;
  dangerZones?: Array<{ center: { lat: number; lng: number }; radius: number; label: string }>;
  originProp?: string;
  destinationProp?: string;
  originCoordsProp?: { lat: number; lng: number } | null;
  destCoordsProp?: { lat: number; lng: number } | null;
  onOriginChange?: (val: string) => void;
  onDestinationChange?: (val: string) => void;
  onOriginCoordsChange?: (coords: { lat: number; lng: number } | null) => void;
  onDestCoordsChange?: (coords: { lat: number; lng: number } | null) => void;
  onPreferSafeRoute?: () => void;
  routeInfoOverrideProp?: { distance: string; duration: string } | null;
  pickToMode?: boolean;
  onTogglePickTo?: () => void;
}

export function ControlPanel({
  userLat,
  userLng,
  userRole,
  onDisaster,
  onAccident,
  onSignOut,
  onNavigate,
  onRouteFound,
  onClearRoute,
  dangerZones = [],
  originProp = '',
  destinationProp = '',
  originCoordsProp = null,
  destCoordsProp = null,
  onOriginChange,
  onDestinationChange,
  onOriginCoordsChange,
  onDestCoordsChange,

  onPreferSafeRoute,
  routeInfoOverrideProp = null,
  pickToMode = false,
  onTogglePickTo
}: ControlPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [origin, setOrigin] = useState(originProp);
  const [destination, setDestination] = useState(destinationProp);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [routeBlocked, setRouteBlocked] = useState(false);

  // Custom Suggestion States
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Selected Coordinates
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(originCoordsProp);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(destCoordsProp);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Sync Props
  useEffect(() => {
    setOrigin(originProp);
  }, [originProp]);

  useEffect(() => {
    setDestination(destinationProp);
  }, [destinationProp]);

  useEffect(() => {
    if (routeInfoOverrideProp) {
      setRouteInfo(routeInfoOverrideProp);
    }
  }, [routeInfoOverrideProp]);

  useEffect(() => {
    setOriginCoords(originCoordsProp);
  }, [originCoordsProp]);

  useEffect(() => {
    setDestCoords(destCoordsProp);
  }, [destCoordsProp]);

  // 1. Reverse Geocode User GPS Location
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'User-Agent': 'SmartRouteAI-EmergencyApp/1.0' }
      });
      const data = await res.json();
      if (data && data.display_name) {
        setOrigin(data.display_name);
        if (onOriginChange) onOriginChange(data.display_name);
      } else {
        const coordsStr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setOrigin(coordsStr);
        if (onOriginChange) onOriginChange(coordsStr);
      }
      setOriginCoords({ lat, lng });
      if (onOriginCoordsChange) onOriginCoordsChange({ lat, lng });
    } catch {
      const coordsStr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setOrigin(coordsStr);
      if (onOriginChange) onOriginChange(coordsStr);
      setOriginCoords({ lat, lng });
      if (onOriginCoordsChange) onOriginCoordsChange({ lat, lng });
    }
  }, [onOriginChange, onOriginCoordsChange]);

  // 2. Debounce Suggestion Searches
  useEffect(() => {
    if (!origin || originCoords) {
      setOriginSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(origin)}`, {
          headers: { 'User-Agent': 'SmartRouteAI-EmergencyApp/1.0' }
        });
        const data = await res.json();
        setOriginSuggestions(data || []);
        setShowOriginDropdown(true);
      } catch {
        setOriginSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [origin, originCoords]);

  useEffect(() => {
    if (!destination || destCoords) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(destination)}`, {
          headers: { 'User-Agent': 'SmartRouteAI-EmergencyApp/1.0' }
        });
        const data = await res.json();
        setDestSuggestions(data || []);
        setShowDestDropdown(true);
      } catch {
        setDestSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [destination, destCoords]);

  // Helper to Geocode address
  const geocodeText = async (query: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'SmartRouteAI-EmergencyApp/1.0' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
    return null;
  };

  // 4. Calculate OSRM Route
  const searchRoute = async () => {
    if (!destination) return;
    setRouteLoading(true);
    setRouteError(null);

    let start = originCoords;
    if (!start && origin) {
      start = await geocodeText(origin);
      if (start) {
        setOriginCoords(start);
        if (onOriginCoordsChange) onOriginCoordsChange(start);
      }
    }

    async function resolveEnd() {
      if (!destCoords && destination) {
        const resolved = await geocodeText(destination);
        if (resolved) {
          setDestCoords(resolved);
          if (onDestCoordsChange) onDestCoordsChange(resolved);
          return resolved;
        }
      }
      return destCoords;
    }
    const endCoordsResolved = await resolveEnd();
    let end = endCoordsResolved;

    if (!start || !endCoordsResolved) {
      setRouteError('Could not resolve locations. Please try typing or selecting on the map.');
      setRouteLoading(false);
      return;
    }

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${endCoordsResolved.lng},${endCoordsResolved.lat}?overview=full&geometries=geojson`;
      const res = await fetch(osrmUrl);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = (route.distance / 1000).toFixed(1) + ' km';
        const durationMin = Math.round(route.duration / 60) + ' mins';
        
        setRouteInfo({ distance: distanceKm, duration: durationMin });

        // Convert OSRM GeoJSON path (lng, lat) to (lat, lng)
        const path = route.geometry.coordinates.map((coord: [number, number]) => ({
          lat: coord[1],
          lng: coord[0]
        }));

        let isBlocked = false;
        if (dangerZones && dangerZones.length > 0) {
          for (const coord of path) {
            for (const zone of dangerZones) {
              const dist = getDistance(coord.lat, coord.lng, zone.center.lat, zone.center.lng);
              if (dist <= zone.radius) {
                isBlocked = true;
                break;
              }
            }
            if (isBlocked) break;
          }
        }
        setRouteBlocked(isBlocked);

        if (onRouteFound) {
          onRouteFound(path, { distance: distanceKm, duration: durationMin });
        }
      } else {
        setRouteError('Route not found between these points.');
      }
    } catch {
      setRouteError('Error calculating route. Please try again.');
    } finally {
      setRouteLoading(false);
    }
  };

  // Trigger searchRoute automatically if both coords change
  useEffect(() => {
    if (originCoords && destCoords) {
      searchRoute();
    }
  }, [originCoords, destCoords]);

  const clearRoute = () => {
    setOrigin('');
    setDestination('');
    setOriginCoords(null);
    setDestCoords(null);
    setRouteInfo(null);
    setRouteError(null);
    setRouteBlocked(false);
    if (onOriginChange) onOriginChange('');
    if (onDestinationChange) onDestinationChange('');
    if (onOriginCoordsChange) onOriginCoordsChange(null);
    if (onDestCoordsChange) onDestCoordsChange(null);
    if (onClearRoute) onClearRoute();
  };

  const fillGPS = () => {
    // First try using already-available location from useGeolocation hook
    if (userLat && userLng) {
      setGpsLoading(true);
      reverseGeocode(userLat, userLng);
      setGpsLoading(false);
      return;
    }
    // Fallback: request fresh location from device
    if (!navigator.geolocation) {
      setRouteError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setGpsLoading(false);
      },
      () => {
        setRouteError('Location access denied. Please allow location permission.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const selectOrigin = (s: any) => {
    const name = s.display_name;
    const coords = { lat: parseFloat(s.lat), lng: parseFloat(s.lon) };
    setOrigin(name);
    setOriginCoords(coords);
    setOriginSuggestions([]);
    setShowOriginDropdown(false);
    if (onOriginChange) onOriginChange(name);
    if (onOriginCoordsChange) onOriginCoordsChange(coords);
  };

  const selectDest = (s: any) => {
    const name = s.display_name;
    const coords = { lat: parseFloat(s.lat), lng: parseFloat(s.lon) };
    setDestination(name);
    setDestCoords(coords);
    setDestSuggestions([]);
    setShowDestDropdown(false);
    if (onDestinationChange) onDestinationChange(name);
    if (onDestCoordsChange) onDestCoordsChange(coords);
  };

  const panelContent = (
    <>
      {/* Brand */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger/15 ring-1 ring-danger/30">
            <span className="text-lg">🚨</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">SMART ROUTE AI</h1>
            <p className="text-[10px] text-white/30">Emergency Response</p>
          </div>
        </div>
        <button onClick={onSignOut} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors">
          Sign Out
        </button>
      </div>

      {/* Route Search */}
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2">📍 Route Planner</p>
        <div className="space-y-2">
          {/* Origin Input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2"><div className="h-2 w-2 rounded-full bg-safe" /></div>
            <input 
              value={origin} 
              onChange={e => {
                const val = e.target.value;
                setOrigin(val);
                setOriginCoords(null); 
                if (onOriginChange) onOriginChange(val);
                if (onOriginCoordsChange) onOriginCoordsChange(null);
              }} 
              placeholder="From — click map or type"
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-14 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-white/20 transition-all" 
            />
            <button onClick={fillGPS} disabled={gpsLoading} title="Use current location" className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-lg bg-safe/10 text-green-400 hover:bg-safe/20 transition disabled:opacity-50">
              {gpsLoading ? <div className="h-3 w-3 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" /> : <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>}
            </button>
            
            {/* Origin Suggestions */}
            {showOriginDropdown && originSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl glass border border-white/10 overflow-hidden shadow-xl max-h-48 overflow-y-auto bg-slate-900/95 backdrop-blur">
                {originSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectOrigin(s)}
                    className="w-full text-left px-3 py-2 text-[10px] text-white/80 hover:bg-white/10 hover:text-white border-b border-white/5 last:border-b-0 transition-colors truncate"
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center -my-0.5">
            <button 
              onClick={() => { 
                const t = origin; 
                setOrigin(destination); 
                setDestination(t); 
                const tc = originCoords;
                setOriginCoords(destCoords);
                setDestCoords(tc);
                if (onOriginChange) onOriginChange(destination);
                if (onDestinationChange) onDestinationChange(t);
                if (onOriginCoordsChange) onOriginCoordsChange(destCoords);
                if (onDestCoordsChange) onDestCoordsChange(tc);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/30 hover:text-white hover:bg-white/15 transition"
            >
              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
            </button>
          </div>

          {/* Destination Input */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2"><div className="h-2 w-2 rounded-full bg-danger" /></div>
            <input 
              value={destination} 
              onChange={e => {
                const val = e.target.value;
                setDestination(val);
                setDestCoords(null);
                if (onDestinationChange) onDestinationChange(val);
                if (onDestCoordsChange) onDestCoordsChange(null);
              }} 
              placeholder="To — click map or type"
              className={`w-full rounded-xl border ${pickToMode ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 bg-white/5'} pl-8 pr-10 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-info/30 transition-all`}
              onKeyDown={e => { if (e.key === 'Enter') searchRoute(); }} 
            />
            <button onClick={onTogglePickTo} title={pickToMode ? 'Cancel map pick' : 'Pick destination on map'} className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-lg transition ${pickToMode ? 'bg-blue-500/25 text-blue-400 ring-1 ring-blue-500/40 animate-pulse' : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'}`}>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            </button>

            {/* Destination Suggestions */}
            {showDestDropdown && destSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl glass border border-white/10 overflow-hidden shadow-xl max-h-48 overflow-y-auto bg-slate-900/95 backdrop-blur">
                {destSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectDest(s)}
                    className="w-full text-left px-3 py-2 text-[10px] text-white/80 hover:bg-white/10 hover:text-white border-b border-white/5 last:border-b-0 transition-colors truncate"
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-2.5">
          <button onClick={searchRoute} disabled={routeLoading || !destination}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl gradient-info border border-info/25 py-2 text-xs font-semibold text-blue-400 hover:brightness-125 transition disabled:opacity-40">
            {routeLoading ? <div className="h-3 w-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /> : '→'}
            {routeLoading ? 'Finding...' : 'Get Route'}
          </button>
          {(routeInfo || origin || destination) && <button onClick={clearRoute} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/40 hover:text-white/60 transition">Clear</button>}
        </div>



        {routeError && <p className="mt-1.5 text-[10px] text-red-400">{routeError}</p>}

        {routeInfo && (
          <div className="mt-2.5 flex gap-2">
            <div className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-center">
              <p className="text-sm font-bold text-blue-400">{routeInfo.distance}</p>
              <p className="text-[8px] uppercase tracking-wider text-white/30">Distance</p>
            </div>
            <div className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-center">
              <p className="text-sm font-bold text-green-400">{routeInfo.duration}</p>
              <p className="text-[8px] uppercase tracking-wider text-white/30">ETA</p>
            </div>
          </div>
        )}

        {routeBlocked && (
          <div className="mt-3 p-3 rounded-xl bg-danger/10 border border-danger/25 text-center">
            <p className="text-xs font-bold text-red-400">⚠️ Route Blocked by Disaster!</p>
            <p className="text-[10px] text-white/55 mt-0.5 mb-2">Please follow the green safe route shown on the map.</p>
            {onPreferSafeRoute && (
              <button 
                onClick={onPreferSafeRoute}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider transition active:scale-95 cursor-pointer shadow"
              >
                Prefer Safe Route 🟢
              </button>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 my-4" />

      {/* Emergency Buttons */}
      <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-3">🆘 Report Emergency</p>
      <div className="space-y-2.5">
        <button onClick={onDisaster}
          className="w-full flex items-center gap-3 rounded-2xl gradient-danger border border-danger/20 px-4 py-4 transition-all hover:border-danger/40 hover:scale-[1.01] active:scale-[0.99] group">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger/20 group-hover:animate-pulse-glow transition">
            <span className="text-xl">🔥</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Disaster Issue</p>
            <p className="text-[10px] text-white/40">Flood, Fire, Earthquake</p>
          </div>
        </button>
        <button onClick={onAccident}
          className="w-full flex items-center gap-3 rounded-2xl bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 px-4 py-4 transition-all hover:border-warning/40 hover:scale-[1.01] active:scale-[0.99] group">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/20 transition">
            <span className="text-xl">🚗</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Accident Case</p>
            <p className="text-[10px] text-white/40">Road Accident, Injury</p>
          </div>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: Right side panel */}
      <div className="hidden lg:flex absolute top-0 right-0 h-full w-96 z-[1000]">
        <div className="glass-strong h-full w-full p-5 overflow-y-auto">
          {panelContent}
        </div>
      </div>

      {/* Mobile: Minimized collapsed trigger bar */}
      <div className="lg:hidden absolute bottom-0 left-0 right-0 z-[1000]">
        {!expanded && (
          <div className="glass-strong px-4 py-3 mx-3 mb-3 flex items-center justify-between"
            onClick={() => setExpanded(true)}>
            <div className="flex items-center gap-2">
              <span className="text-lg">🚨</span>
              <span className="text-xs font-bold text-white">SMART ROUTE AI</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); onDisaster(); }}
                className="rounded-lg bg-danger/15 px-3 py-1.5 text-[10px] font-bold text-red-400">🔥 Disaster</button>
              <button onClick={(e) => { e.stopPropagation(); onAccident(); }}
                className="rounded-lg bg-warning/15 px-3 py-1.5 text-[10px] font-bold text-amber-400">🚗 Accident</button>
              <div className="h-1 w-8 rounded-full bg-white/20" />
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Drawer (Right-side slide-in panel) */}
      <div className={`lg:hidden fixed inset-0 z-[1000] pointer-events-none`}>
        {/* Backdrop */}
        <div 
          onClick={() => setExpanded(false)} 
          className={`absolute inset-0 bg-black/60 pointer-events-auto transition-opacity duration-300 ${expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />
        
        {/* Drawer Panel */}
        <div className={`absolute top-0 right-0 h-screen w-[85%] max-w-md glass-strong p-5 overflow-y-auto pointer-events-auto shadow-2xl transition-transform duration-300 ease-in-out transform ${expanded ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Close (X) button at top-right */}
          <div className="flex justify-end mb-2">
            <button 
              onClick={() => setExpanded(false)} 
              className="text-white/60 hover:text-white p-1 text-lg font-bold transition-colors"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          {panelContent}
        </div>
      </div>
    </>
  );
}
