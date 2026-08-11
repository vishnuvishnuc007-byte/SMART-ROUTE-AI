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
  onMapClick?: (lat: number, lng: number) => void;
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
  onMapClick,
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

  const callbacksRef = useRef({ onMapClick });
  useEffect(() => {
    callbacksRef.current = { onMapClick };
  }, [onMapClick]);

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
    return `
      <div class="relative flex items-center justify-center">
        <!-- pulsing red dot pin -->
        <div class="card-marker-dot"></div>
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

    // Map Click Listener - only active in pick mode
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (callbacksRef.current.onMapClick) {
        callbacksRef.current.onMapClick(lat, lng);
      }
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
