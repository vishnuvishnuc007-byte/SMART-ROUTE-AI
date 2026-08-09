'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Report } from '@/lib/constants';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useRealtimeReports } from '@/hooks/useRealtimeReports';
import { useAmbulanceTracking } from '@/hooks/useAmbulanceTracking';
import { createClient } from '@/lib/supabase/client';
import { ControlPanel } from '@/components/ControlPanel';
import { ReportModal } from '@/components/ReportModal';
import { AccidentOverlay } from '@/components/AccidentOverlay';
import { AmbulanceTracker } from '@/components/AmbulanceTracker';
import { VerificationCamera } from '@/components/VerificationCamera';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-950 text-white">
      <div className="w-8 h-8 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
    </div>
  )
});

export default function HomePage() {
  const router = useRouter();
  const { latitude, longitude, loading: geoLoading } = useGeolocation();
  const { reports } = useRealtimeReports();
  const [reportType, setReportType] = useState<'disaster' | 'accident' | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationReportId, setVerificationReportId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ role: string; id: string } | null>(null);
  const [selectedAccident, setSelectedAccident] = useState<Report | null>(null);
  const [activeRoute, setActiveRoute] = useState<Array<{ lat: number; lng: number }> | null>(null);
  const [incomingCallReport, setIncomingCallReport] = useState<Report | null>(null);

  // Manual routing selection states
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [fromCoords, setFromCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [toCoords, setToCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Detour Alternate Route States
  const [alternativeRoute, setAlternativeRoute] = useState<Array<{ lat: number; lng: number }> | null>(null);
  const [alternativeRouteInfo, setAlternativeRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [routeInfoOverride, setRouteInfoOverride] = useState<{ distance: string; duration: string } | null>(null);
  const [customReportCoords, setCustomReportCoords] = useState<{ lat: number; lng: number } | null>(null);



  const mapCenter = latitude && longitude
      ? { lat: latitude, lng: longitude }
      : { lat: 20.5937, lng: 78.9629 };

  useEffect(() => {
    const supabase = createClient();
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (data) setUserProfile({ role: data.role, id: user.id });
    };
    getProfile();
  }, [router]);

  // Reactive verification trigger: opens incoming prompt if status is 'verification_requested'
  useEffect(() => {
    if (!userProfile) return;
    const pendingVerification = reports.find(
      r => r.reporter_id === userProfile.id && r.status === 'verification_requested'
    );
    if (pendingVerification) {
      if (!showVerification) {
        setIncomingCallReport(pendingVerification);
      }
    } else {
      setIncomingCallReport(null);
      if (!pendingVerification) {
        setShowVerification(false);
        setVerificationReportId(null);
      }
    }
  }, [reports, userProfile, showVerification]);

  const handleDeclineCall = async () => {
    if (!incomingCallReport) return;
    const supabase = createClient();
    await supabase.from('reports').update({ status: 'pending' }).eq('id', incomingCallReport.id);
    setIncomingCallReport(null);
  };

  const handleAcceptCall = () => {
    if (!incomingCallReport) return;
    setVerificationReportId(incomingCallReport.id);
    setShowVerification(true);
    setIncomingCallReport(null);
  };

  const verifiedDisasters = reports.filter(r => r.type === 'disaster' && (r.status === 'verified' || r.danger_zone));
  const verifiedAccidents = reports.filter(r => r.type === 'accident' && (r.status === 'verified' || r.status === 'dispatched'));
  const activeAmbulanceReport = reports.find(r => r.status === 'dispatched' && r.type === 'accident');
  const ambulanceTracking = useAmbulanceTracking(activeAmbulanceReport?.id);

  const localDangerZones = verifiedDisasters
    .filter(d => d.danger_zone)
    .map(d => {
      const typeMatch = d.description?.match(/\[Type:\s*([^\]]+)\]/);
      const disType = typeMatch ? typeMatch[1] : 'Disaster';
      return {
        id: d.id,
        center: d.danger_zone!.center,
        radius: d.danger_zone!.radius,
        label: `${disType} - Blocked`
      };
    });



  // Calculate detour and blockages
  const checkRouteBlockage = useCallback((routePath: Array<{ lat: number; lng: number }>) => {
    if (!fromCoords || !toCoords) return;

    let blockedZone = null;
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

    // Check intersection with any zone
    for (const pt of routePath) {
      for (const zone of localDangerZones) {
        const dist = getDistance(pt.lat, pt.lng, zone.center.lat, zone.center.lng);
        if (dist <= zone.radius) {
          blockedZone = zone;
          break;
        }
      }
      if (blockedZone) break;
    }

    if (blockedZone) {
      // Calculate perpendicular detour points
      const dx = toCoords.lat - fromCoords.lat;
      const lngFactor = Math.cos(fromCoords.lat * Math.PI / 180);
      const dy = (toCoords.lng - fromCoords.lng) * lngFactor;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (len > 0) {
        const px = -dy / len;
        const py = dx / len;
        const radiusDeg = blockedZone.radius / 111000;
        const offset = radiusDeg * 2.0; // 2x the radius to clear it

        // We can just use one of the detour options, say the right side
        const detourPt = {
          lat: blockedZone.center.lat + px * offset,
          lng: blockedZone.center.lng + (py * offset) / lngFactor
        };

        // Fetch detour path from OSRM to display in green on the map
        const detourUrl = `https://router.project-osrm.org/route/v1/driving/${fromCoords.lng},${fromCoords.lat};${detourPt.lng},${detourPt.lat};${toCoords.lng},${toCoords.lat}?overview=full&geometries=geojson`;
        fetch(detourUrl)
          .then(res => res.json())
          .then(data => {
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const routeCoords = route.geometry.coordinates.map((coord: [number, number]) => ({
                lat: coord[1],
                lng: coord[0]
              }));
              const distanceKm = (route.distance / 1000).toFixed(1) + ' km';
              const durationMin = Math.round(route.duration / 60) + ' mins';
              
              setAlternativeRoute(routeCoords);
              setAlternativeRouteInfo({ distance: distanceKm, duration: durationMin });
            }
          })
          .catch(err => {
            console.error('Error fetching OSRM detour route:', err);
            setAlternativeRoute(null);
            setAlternativeRouteInfo(null);
          });
      } else {
        setAlternativeRoute(null);
        setAlternativeRouteInfo(null);
      }
    } else {
      setAlternativeRoute(null);
      setAlternativeRouteInfo(null);
    }
  }, [fromCoords, toCoords, localDangerZones]);

  useEffect(() => {
    if (activeRoute) {
      checkRouteBlockage(activeRoute);
    } else {
      setAlternativeRoute(null);
      setAlternativeRouteInfo(null);
    }
  }, [activeRoute, checkRouteBlockage]);

  // Click "Prefer Safe Route" swaps main route with safe detour coordinates
  const handlePreferSafeRoute = () => {
    if (alternativeRoute) {
      setActiveRoute(alternativeRoute);
      setRouteInfoOverride(alternativeRouteInfo);
      setAlternativeRoute(null);
      setAlternativeRouteInfo(null);
    }
  };

  // Map selections click geocoding
  const handleSetFromMap = async (lat: number, lng: number) => {
    setFromCoords({ lat, lng });
    setRouteInfoOverride(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'User-Agent': 'SmartRouteAI-EmergencyApp/1.0' }
      });
      const data = await res.json();
      if (data && data.display_name) {
        setFromText(data.display_name);
      } else {
        setFromText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch {
      setFromText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleSetToMap = async (lat: number, lng: number) => {
    setToCoords({ lat, lng });
    setRouteInfoOverride(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'User-Agent': 'SmartRouteAI-EmergencyApp/1.0' }
      });
      const data = await res.json();
      if (data && data.display_name) {
        setToText(data.display_name);
      } else {
        setToText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch {
      setToText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };



  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full Screen Map */}
      <div className="absolute inset-0">
        <LeafletMap
          center={mapCenter}
          zoom={latitude ? 14 : 5}
          userLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
          dangerZones={localDangerZones}
          safeRoutes={verifiedDisasters
            .filter(d => d.safe_route)
            .map(d => ({
              id: d.id,
              path: d.safe_route!
            }))}
          accidents={verifiedAccidents.map(a => ({
            id: a.id,
            latitude: a.latitude,
            longitude: a.longitude,
            description: a.description || undefined,
            image_url: a.image_url || undefined,
            verification_video_url: a.verification_video_url || undefined,
            hospital_qr_data: a.hospital_qr_data || undefined
          }))}
          ambulanceLocation={
            ambulanceTracking
              ? { lat: ambulanceTracking.latitude, lng: ambulanceTracking.longitude }
              : null
          }
          activeRoute={activeRoute}
          onAccidentClick={(acc) => {
            const fullAccident = verifiedAccidents.find(a => a.id === acc.id);
            if (fullAccident) setSelectedAccident(fullAccident);
          }}
          onSetFrom={handleSetFromMap}
          onSetTo={handleSetToMap}
          onMarkDisaster={(lat, lng) => {
            setCustomReportCoords({ lat, lng });
            setReportType('disaster');
          }}
          fromCoords={fromCoords}
          toCoords={toCoords}
          alternativeRoute={alternativeRoute}
        />
      </div>

      {/* Control Panel - right side on desktop, bottom sheet on mobile */}
      <ControlPanel
        userLat={latitude}
        userLng={longitude}
        userRole={userProfile?.role || 'user'}
        onDisaster={() => setReportType('disaster')}
        onAccident={() => setReportType('accident')}
        onSignOut={handleSignOut}
        onNavigate={(path) => router.push(path)}
        onRouteFound={(path) => {
          setActiveRoute(path);
          setRouteInfoOverride(null);
        }}
        onClearRoute={() => {
          setActiveRoute(null);
          setFromCoords(null);
          setToCoords(null);
          setFromText('');
          setToText('');
          setAlternativeRoute(null);
          setAlternativeRouteInfo(null);
          setRouteInfoOverride(null);
        }}
        dangerZones={localDangerZones}
        originProp={fromText}
        destinationProp={toText}
        originCoordsProp={fromCoords}
        destCoordsProp={toCoords}
        onOriginChange={setFromText}
        onDestinationChange={setToText}
        onOriginCoordsChange={setFromCoords}
        onDestCoordsChange={setToCoords}

        onPreferSafeRoute={handlePreferSafeRoute}
        routeInfoOverrideProp={routeInfoOverride}
      />

      {/* GPS loading */}
      {geoLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] glass px-4 py-2 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <span className="text-xs text-white/60">Getting your location...</span>
        </div>
      )}

      {/* Report Modal */}
      {reportType && (
        <ReportModal
          type={reportType}
          latitude={customReportCoords ? customReportCoords.lat : (latitude || mapCenter.lat)}
          longitude={customReportCoords ? customReportCoords.lng : (longitude || mapCenter.lng)}
          onClose={() => {
            setReportType(null);
            setCustomReportCoords(null);
          }}
        />
      )}

      {/* Verification Camera */}
      {showVerification && verificationReportId && (
        <VerificationCamera
          reportId={verificationReportId}
          onComplete={() => { setShowVerification(false); setVerificationReportId(null); }}
          onCancel={() => { setShowVerification(false); setVerificationReportId(null); }}
        />
      )}

      {/* Incoming Verification Call Prompt */}
      {incomingCallReport && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-strong max-w-sm w-full p-6 text-center space-y-6 border border-white/10 rounded-3xl shadow-2xl animate-scale-up">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center bg-danger/10 border-2 border-danger/30 rounded-full">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger/20 opacity-75"></span>
              <span className="text-3xl animate-bounce">📞</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-white tracking-tight">Verification Request</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                The control center wants to verify the reported emergency via a 30-second live camera recording.
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleDeclineCall}
                className="flex-1 rounded-2xl bg-danger/20 border border-danger/30 py-3 text-xs font-bold text-red-400 hover:bg-danger/35 active:scale-95 transition"
              >
                Decline
              </button>
              <button 
                onClick={handleAcceptCall}
                className="flex-1 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 py-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/35 active:scale-95 transition animate-pulse-glow"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accident Overlay for Blurred Inspection */}
      {selectedAccident && (
        <AccidentOverlay report={selectedAccident} onClose={() => setSelectedAccident(null)} />
      )}

      {/* Ambulance Tracker */}
      {ambulanceTracking && activeAmbulanceReport && (
        <AmbulanceTracker tracking={ambulanceTracking} report={activeAmbulanceReport} />
      )}
    </div>
  );
}
