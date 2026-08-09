'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';

interface LeafletMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  userLocation: { lat: number; lng: number } | null;
  dangerZones: Array<{ id: string; center: { lat: number; lng: number }; radius: number; label?: string }>;
  safeRoutes: Array<{ id: string; path: Array<{ lat: number; lng: number }> }>;
  accidents: Array<{ 
    id: string; 
    latitude: number; 
    longitude: number; 
    description?: string;
    image_url?: string;
    verification_video_url?: string;
    hospital_qr_data?: string;
  }>;
  ambulanceLocation: { lat: number; lng: number } | null;
  activeRoute: Array<{ lat: number; lng: number }> | null;
  onAccidentClick?: (accident: any) => void;
  onSetFrom?: (lat: number, lng: number) => void;
  onSetTo?: (lat: number, lng: number) => void;
  onMarkDisaster?: (lat: number, lng: number) => void;
  fromCoords?: { lat: number; lng: number } | null;
  toCoords?: { lat: number; lng: number } | null;
  alternativeRoute?: Array<{ lat: number; lng: number }> | null;
}

export default function LeafletMap({
  center,
  zoom,
  userLocation,
  dangerZones,
  safeRoutes,
  accidents,
  ambulanceLocation,
  activeRoute,
  onAccidentClick,
  onSetFrom,
  onSetTo,
  onMarkDisaster,
  fromCoords,
  toCoords,
  alternativeRoute
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Layers refs to update dynamically
  const userMarkerRef = useRef<L.Marker | null>(null);
  const fromMarkerRef = useRef<L.Marker | null>(null);
  const toMarkerRef = useRef<L.Marker | null>(null);
  const ambulanceMarkerRef = useRef<L.Marker | null>(null);
  const dangerZoneLayersRef = useRef<L.Circle[]>([]);
  const dangerZoneLabelsRef = useRef<L.Marker[]>([]);
  const safeRouteLayersRef = useRef<L.Polyline[]>([]);
  const accidentMarkersRef = useRef<L.Marker[]>([]);
  const activeRoutePolylinesRef = useRef<L.Polyline[]>([]);
  const alternativeRoutePolylineRef = useRef<L.Polyline | null>(null);

  // Save callbacks to ref to avoid re-triggering map click initialization
  const callbacksRef = useRef({ onSetFrom, onSetTo, onMarkDisaster });
  useEffect(() => {
    callbacksRef.current = { onSetFrom, onSetTo, onMarkDisaster };
  }, [onSetFrom, onSetTo, onMarkDisaster]);

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

  // Helper to build dark glassmorphic card content inside the marker directly
  const getCardMarkerHTML = (acc: any) => {
    const videoHtml = acc.verification_video_url 
      ? `<div class="relative w-full h-32 rounded-xl overflow-hidden bg-slate-950 mt-1">
           <video src="${acc.verification_video_url}" muted loop playsinline class="w-full h-full object-cover"></video>
           <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
           <div class="absolute bottom-2 left-2">
             <span class="px-1.5 py-0.5 rounded bg-red-500/25 border border-red-500/35 text-[8px] font-bold text-red-400">⚡ LIVE</span>
           </div>
         </div>`
      : acc.image_url
        ? `<div class="relative w-full h-32 rounded-xl overflow-hidden bg-slate-950 mt-1">
             <img src="${acc.image_url}" class="w-full h-full object-cover">
             <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
           </div>`
        : `<div class="h-20 flex items-center justify-center bg-red-500/5 border border-red-500/10 rounded-xl mt-1 text-center">
             <div>
               <span class="text-xl">⚠️</span>
               <p class="text-[9px] text-white/40 mt-0.5 font-semibold">Accident Ahead</p>
             </div>
           </div>`;

    const qrHtml = acc.hospital_qr_data
      ? `<div class="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-white/5">
           <div class="bg-white p-1 rounded-lg">
             <img src="https://api.qrserver.com/v1/create-qr-code/?size=48x48&data=${encodeURIComponent(acc.hospital_qr_data)}" width="40" height="40" alt="Hospital QR">
           </div>
           <div class="text-left">
             <p class="text-[9px] font-bold text-white leading-tight">Hospital Support</p>
             <p class="text-[7px] text-white/40">Scan to contribute to treatment</p>
           </div>
         </div>`
      : '';

    return `
      <div class="relative flex items-center justify-center">
        <!-- pulsing red dot pin -->
        <div class="card-marker-dot"></div>
        
        <!-- absolute card float above -->
        <div class="absolute bottom-3 flex flex-col items-center">
          <!-- The Card Box -->
          <div class="glass-strong w-60 p-3 rounded-2xl border border-white/10 shadow-2xl space-y-1.5 text-center pointer-events-auto">
            <div class="flex items-center justify-between">
              <span class="text-[8px] font-extrabold text-red-400 uppercase bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded">ACCIDENT</span>
              <span class="text-[8px] text-white/30 font-mono">📍 ${acc.latitude ? acc.latitude.toFixed(3) : ''}, ${acc.longitude ? acc.longitude.toFixed(3) : ''}</span>
            </div>
            
            <div class="text-left">
              <p class="text-[10px] font-semibold text-white/90 leading-snug line-clamp-2">${acc.description || 'Road accident reported'}</p>
            </div>

            ${videoHtml}

            <div class="grid grid-cols-2 gap-1.5 pt-1">
              <div class="rounded-lg bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 text-center">
                <span class="text-xs">🐌</span>
                <p class="text-[6px] font-bold uppercase text-amber-400">Drive Slow</p>
              </div>
              <div class="rounded-lg bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 text-center">
                <span class="text-xs">🚑</span>
                <p class="text-[6px] font-bold uppercase text-blue-400 mt-0.5">Ambulance</p>
              </div>
            </div>

            ${qrHtml}
          </div>
          
          <!-- Down Arrow -->
          <div class="card-marker-arrow"></div>
        </div>
      </div>
    `;
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([center.lat, center.lng], zoom);

    mapRef.current = map;

    // Add Dark Mode CartoDB tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    // Map Click Listener
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      
      const container = L.DomUtil.create('div', 'map-click-menu');
      container.innerHTML = `
        <div class="flex flex-col gap-1.5 p-1 min-w-[130px]">
          <button id="btn-set-from" class="w-full text-left bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded transition shadow-sm cursor-pointer">🟢 Set as FROM</button>
          <button id="btn-set-to" class="w-full text-left bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded transition shadow-sm cursor-pointer">🔴 Set as TO</button>
          <button id="btn-mark-disaster" class="w-full text-left bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded transition shadow-sm cursor-pointer font-semibold">⚠️ Mark Disaster Here</button>
        </div>
      `;

      L.popup()
        .setLatLng(e.latlng)
        .setContent(container)
        .openOn(map);

      setTimeout(() => {
        document.getElementById('btn-set-from')?.addEventListener('click', () => {
          if (callbacksRef.current.onSetFrom) callbacksRef.current.onSetFrom(lat, lng);
          map.closePopup();
        });
        document.getElementById('btn-set-to')?.addEventListener('click', () => {
          if (callbacksRef.current.onSetTo) callbacksRef.current.onSetTo(lat, lng);
          map.closePopup();
        });
        document.getElementById('btn-mark-disaster')?.addEventListener('click', () => {
          if (callbacksRef.current.onMarkDisaster) callbacksRef.current.onMarkDisaster(lat, lng);
          map.closePopup();
        });
      }, 50);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click');
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Handle map view changes (center/zoom)
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom());
    }
  }, [center]);

  // 3. User Location Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLocation) {
      const pos: L.LatLngExpression = [userLocation.lat, userLocation.lng];
      
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(pos);
      } else {
        const pulseIcon = L.divIcon({
          className: 'custom-pulse-marker',
          html: `<div class="user-pulse-dot"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        userMarkerRef.current = L.marker(pos, { icon: pulseIcon }).addTo(map);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  // Manual FROM/TO Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (fromCoords) {
      const pos: L.LatLngExpression = [fromCoords.lat, fromCoords.lng];
      if (fromMarkerRef.current) {
        fromMarkerRef.current.setLatLng(pos);
      } else {
        const fromIcon = L.divIcon({
          className: 'custom-from-marker',
          html: `<div class="flex items-center justify-center bg-emerald-500 text-white font-bold rounded-full w-6 h-6 border-2 border-white shadow-lg text-[10px]">A</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        fromMarkerRef.current = L.marker(pos, { icon: fromIcon }).addTo(map);
      }
    } else if (fromMarkerRef.current) {
      fromMarkerRef.current.remove();
      fromMarkerRef.current = null;
    }
  }, [fromCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (toCoords) {
      const pos: L.LatLngExpression = [toCoords.lat, toCoords.lng];
      if (toMarkerRef.current) {
        toMarkerRef.current.setLatLng(pos);
      } else {
        const toIcon = L.divIcon({
          className: 'custom-to-marker',
          html: `<div class="flex items-center justify-center bg-blue-500 text-white font-bold rounded-full w-6 h-6 border-2 border-white shadow-lg text-[10px]">B</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        toMarkerRef.current = L.marker(pos, { icon: toIcon }).addTo(map);
      }
    } else if (toMarkerRef.current) {
      toMarkerRef.current.remove();
      toMarkerRef.current = null;
    }
  }, [toCoords]);

  // 4. Danger Zones (Red Circles + Labels)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old circles and labels
    dangerZoneLayersRef.current.forEach(circle => circle.remove());
    dangerZoneLayersRef.current = [];
    dangerZoneLabelsRef.current.forEach(marker => marker.remove());
    dangerZoneLabelsRef.current = [];

    // Add new circles and labels
    dangerZones.forEach(zone => {
      const circle = L.circle([zone.center.lat, zone.center.lng], {
        radius: zone.radius,
        fillColor: '#ef4444',
        fillOpacity: 0.2,
        color: '#ef4444',
        opacity: 0.6,
        weight: 2
      }).addTo(map);
      dangerZoneLayersRef.current.push(circle);

      const labelIcon = L.divIcon({
        className: 'custom-disaster-label',
        html: `
          <div class="flex flex-col items-center select-none pointer-events-none">
            <div class="bg-red-600/90 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 shadow-lg whitespace-nowrap">
              ⚠️ ${zone.label || 'Disaster Blocked'}
            </div>
            <div class="w-0.5 h-1.5 bg-red-600/90"></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const labelMarker = L.marker([zone.center.lat, zone.center.lng], { icon: labelIcon }).addTo(map);
      dangerZoneLabelsRef.current.push(labelMarker);
    });
  }, [dangerZones]);

  // 5. Safe Alternate Routes (Green Polylines)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old routes
    safeRouteLayersRef.current.forEach(line => line.remove());
    safeRouteLayersRef.current = [];

    // Add new routes
    safeRoutes.forEach(route => {
      if (route.path.length > 1) {
        const points = route.path.map(p => [p.lat, p.lng] as L.LatLngExpression);
        const polyline = L.polyline(points, {
          color: '#22c55e',
          weight: 6,
          opacity: 0.85,
          dashArray: '12, 12',
          className: 'safe-route-flow'
        }).addTo(map);
        safeRouteLayersRef.current.push(polyline);
      }
    });
  }, [safeRoutes]);

  // 6. Active Route Search (Blue/Red Polylines based on danger overlap)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old polylines
    activeRoutePolylinesRef.current.forEach(line => line.remove());
    activeRoutePolylinesRef.current = [];

    if (activeRoute && activeRoute.length > 1) {
      let currentSegment: L.LatLngExpression[] = [];
      let currentIsBlocked = false;

      const isPointBlocked = (lat: number, lng: number) => {
        return dangerZones.some(zone => {
          const dist = getDistance(lat, lng, zone.center.lat, zone.center.lng);
          return dist <= zone.radius;
        });
      };

      activeRoute.forEach((pt, index) => {
        const ptBlocked = isPointBlocked(pt.lat, pt.lng);
        if (index === 0) {
          currentSegment.push([pt.lat, pt.lng]);
          currentIsBlocked = ptBlocked;
          return;
        }

        if (ptBlocked === currentIsBlocked) {
          currentSegment.push([pt.lat, pt.lng]);
        } else {
          currentSegment.push([pt.lat, pt.lng]);
          const polyline = L.polyline(currentSegment, {
            color: currentIsBlocked ? '#ef4444' : '#3b82f6',
            weight: 6,
            opacity: 0.85,
            dashArray: currentIsBlocked ? '8, 8' : undefined
          }).addTo(map);
          activeRoutePolylinesRef.current.push(polyline);

          currentSegment = [[pt.lat, pt.lng]];
          currentIsBlocked = ptBlocked;
        }
      });

      if (currentSegment.length > 0) {
        const polyline = L.polyline(currentSegment, {
          color: currentIsBlocked ? '#ef4444' : '#3b82f6',
          weight: 6,
          opacity: 0.85,
          dashArray: currentIsBlocked ? '8, 8' : undefined
        }).addTo(map);
        activeRoutePolylinesRef.current.push(polyline);
      }

      const allPoints = activeRoute.map(p => [p.lat, p.lng] as L.LatLngExpression);
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [activeRoute, dangerZones]);

  // 6b. Alternative Route Polyline (Green bypass)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (alternativeRoutePolylineRef.current) {
      alternativeRoutePolylineRef.current.remove();
      alternativeRoutePolylineRef.current = null;
    }

    if (alternativeRoute && alternativeRoute.length > 1) {
      const points = alternativeRoute.map(p => [p.lat, p.lng] as L.LatLngExpression);
      const polyline = L.polyline(points, {
        color: '#22c55e',
        weight: 6,
        opacity: 0.85,
        dashArray: '12, 12',
        className: 'safe-route-flow'
      }).addTo(map);
      alternativeRoutePolylineRef.current = polyline;
    }
  }, [alternativeRoute]);

  // 7. Accident Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    accidentMarkersRef.current.forEach(m => m.remove());
    accidentMarkersRef.current = [];

    // Add new accident markers
    accidents.forEach(acc => {
      const pos: L.LatLngExpression = [acc.latitude, acc.longitude];
      const accidentIcon = L.divIcon({
        className: 'custom-card-marker-wrapper',
        html: getCardMarkerHTML(acc),
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker(pos, { icon: accidentIcon })
        .addTo(map)
        .on('click', () => {
          if (onAccidentClick) onAccidentClick(acc);
        });

      setTimeout(() => {
        const markerElement = marker.getElement();
        if (markerElement) {
          const video = markerElement.querySelector('video');
          if (video) {
            video.play().catch(err => {
              console.log('Map marker video autoplay caught and bypassed:', err.message);
            });
          }
        }
      }, 50);

      accidentMarkersRef.current.push(marker);
    });
  }, [accidents, onAccidentClick]);

  // 8. Ambulance Location Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (ambulanceLocation) {
      const pos: L.LatLngExpression = [ambulanceLocation.lat, ambulanceLocation.lng];
      
      if (ambulanceMarkerRef.current) {
        ambulanceMarkerRef.current.setLatLng(pos);
      } else {
        const ambulanceIcon = L.divIcon({
          className: 'custom-ambulance-marker',
          html: `<div class="ambulance-glow-marker">🚑</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        ambulanceMarkerRef.current = L.marker(pos, { icon: ambulanceIcon }).addTo(map);
      }
    } else if (ambulanceMarkerRef.current) {
      ambulanceMarkerRef.current.remove();
      ambulanceMarkerRef.current = null;
    }
  }, [ambulanceLocation]);

  return (
    <div className="relative w-full h-full">
      {/* Styles for pulsing custom markers and custom popup cards */}
      <style jsx global>{`
        .custom-pulse-marker {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .user-pulse-dot {
          width: 14px;
          height: 14px;
          background: #3b82f6;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px #3b82f6;
          animation: userPulse 2s infinite;
        }
        @keyframes userPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }

        .custom-accident-marker, .custom-ambulance-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .accident-glow-marker {
          font-size: 24px;
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
          animation: accidentAlert 1s infinite alternate;
        }
        .ambulance-glow-marker {
          font-size: 24px;
          filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8));
        }
        @keyframes accidentAlert {
          0% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1.1);
          }
        }

        /* Sleek Glassmorphic Map Card Markers */
        .custom-card-marker-wrapper {
          position: absolute;
          z-index: 1000 !important;
        }
        .card-marker-arrow {
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid rgba(15, 23, 42, 0.85);
          filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.4));
          margin-top: -1px;
        }
        .card-marker-dot {
          width: 12px;
          height: 12px;
          background: #ef4444;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 10px #ef4444;
          z-index: 20;
          animation: markerPulse 1.5s infinite;
        }
        @keyframes markerPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        /* Safe Alternate Route Animated Dash Flow */
        .safe-route-flow {
          animation: routeFlow 1.5s linear infinite;
        }
        @keyframes routeFlow {
          from {
            stroke-dashoffset: 24;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        /* Leaflet routing container hidden box override */
        .leaflet-routing-container {
          display: none !important;
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full bg-slate-950" />
    </div>
  );
}
