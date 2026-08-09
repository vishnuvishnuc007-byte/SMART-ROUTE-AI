'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Report } from '@/lib/constants';
import { useRealtimeReports } from '@/hooks/useRealtimeReports';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-950 text-white">
      <div className="w-8 h-8 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
    </div>
  )
});

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const { reports } = useRealtimeReports();
  const [user, setUser] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Map state
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 20.5937, lng: 78.9629 });
  const [mapZoom, setMapZoom] = useState<number>(5);
  const [ambulanceTrackings, setAmbulanceTrackings] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (!profile || profile.role !== 'admin') {
        router.push('/home');
        return;
      }
      setUser(profile);
    };
    checkAuth();
  }, [router, supabase]);

  // Fetch active ambulance trackings
  useEffect(() => {
    if (!user) return;
    const fetchTracking = async () => {
      const { data } = await supabase.from('ambulance_tracking').select('*');
      if (data) setAmbulanceTrackings(data);
    };
    fetchTracking();

    const channel = supabase
      .channel('ambulance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_tracking' }, () => {
        fetchTracking();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, supabase]);

  // Auto center map on the first filtered report if available
  useEffect(() => {
    const pendingReport = reports.find(r => r.status === 'pending');
    if (pendingReport) {
      setMapCenter({ lat: pendingReport.latitude, lng: pendingReport.longitude });
      setMapZoom(12);
    } else if (reports.length > 0) {
      setMapCenter({ lat: reports[0].latitude, lng: reports[0].longitude });
      setMapZoom(10);
    }
  }, [reports]);

  if (!user) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Admin Workspace...</div>;

  const filteredReports = reports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterType !== 'all' && r.type !== filterType) return false;
    return true;
  });

  const total = reports.length;
  const pending = reports.filter(r => r.status === 'pending').length;
  const verified = reports.filter(r => r.status === 'verified').length;
  const resolved = reports.filter(r => r.status === 'resolved').length;

  const handleRequestVerification = async (report: Report) => {
    await supabase.from('reports').update({ status: 'verification_requested' }).eq('id', report.id);
  };

  const handleQuickApprove = async (report: Report) => {
    await supabase.from('reports').update({ status: 'verified' }).eq('id', report.id);
  };

  const handleApproveDisaster = async (report: Report) => {
    await supabase.from('reports').update({
      status: 'verified',
      danger_zone: {
        center: { lat: report.latitude, lng: report.longitude },
        radius: 1000,
      },
      safe_route: [
        { lat: report.latitude + 0.005, lng: report.longitude - 0.005 },
        { lat: report.latitude + 0.008, lng: report.longitude },
        { lat: report.latitude + 0.01, lng: report.longitude + 0.005 },
        { lat: report.latitude + 0.012, lng: report.longitude + 0.01 },
      ],
    }).eq('id', report.id);
  };

  const handleApproveAccident = async (report: Report) => {
    await supabase.from('reports').update({ status: 'verified' }).eq('id', report.id);
  };

  const handleDispatchAmbulance = async (report: Report) => {
    await supabase.from('ambulance_tracking').insert({
      report_id: report.id,
      latitude: report.latitude + 0.005,
      longitude: report.longitude + 0.005,
      eta_minutes: 8,
      status: 'dispatched',
    });
    await supabase.from('reports').update({
      status: 'dispatched',
      hospital_qr_data: `https://smartroute.ai/donate/${report.id}`,
      updated_at: new Date().toISOString(),
    }).eq('id', report.id);
  };

  const handleMarkResolved = async (report: Report) => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-white/10 text-white border border-white/20';
      case 'verification_requested': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'verified': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'dispatched': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'resolved': return 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20';
      default: return 'bg-white/10 text-white';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'disaster' 
      ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  };

  const handleReportClick = (report: Report) => {
    setMapCenter({ lat: report.latitude, lng: report.longitude });
    setMapZoom(14);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-slate-950 font-sans text-white">
      
      {/* 1. Sidebar Dashboard - left on desktop, bottom on mobile */}
      <div className="w-full lg:w-[460px] h-[60vh] lg:h-full overflow-y-auto glass-strong p-4 flex flex-col z-20 border-t lg:border-t-0 lg:border-r border-white/10 order-2 lg:order-1 shrink-0">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div>
              <h1 className="text-sm font-bold text-white uppercase tracking-wider">Admin Workspace</h1>
              <p className="text-[10px] text-white/30">Control Center</p>
            </div>
          </div>
          <Link href="/home" className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition">
            Map Page
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="glass px-2 py-3 rounded-xl text-center border border-white/5">
            <div className="text-lg font-extrabold text-white">{total}</div>
            <div className="text-[8px] uppercase tracking-wider text-white/40">Total</div>
          </div>
          <div className="glass px-2 py-3 rounded-xl text-center border border-white/5">
            <div className="text-lg font-extrabold text-red-400">{pending}</div>
            <div className="text-[8px] uppercase tracking-wider text-white/40">Pending</div>
          </div>
          <div className="glass px-2 py-3 rounded-xl text-center border border-white/5">
            <div className="text-lg font-extrabold text-emerald-400">{verified}</div>
            <div className="text-[8px] uppercase tracking-wider text-white/40">Verified</div>
          </div>
          <div className="glass px-2 py-3 rounded-xl text-center border border-white/5">
            <div className="text-lg font-extrabold text-neutral-400">{resolved}</div>
            <div className="text-[8px] uppercase tracking-wider text-white/40">Resolved</div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-white/20"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verification_requested">Verification Sent</option>
            <option value="verified">Verified</option>
            <option value="dispatched">Dispatched</option>
            <option value="resolved">Resolved</option>
          </select>

          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70 focus:outline-none focus:border-white/20"
          >
            <option value="all">All Types</option>
            <option value="accident">Accidents Only</option>
            <option value="disaster">Disasters Only</option>
          </select>
        </div>

        {/* Reports List */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {filteredReports.map((report) => (
            <div 
              key={report.id} 
              onClick={() => handleReportClick(report)}
              className="glass p-4 rounded-2xl border border-white/5 hover:border-white/15 cursor-pointer transition-all space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider font-bold ${getTypeColor(report.type)}`}>
                    {report.type}
                  </span>
                </div>
                <div className="text-[10px] text-white/30">{new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>

              <div>
                <p className="text-xs text-white/80 line-clamp-2">{report.description}</p>
                <p className="text-[9px] text-white/30 font-mono mt-1">📍 {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</p>
              </div>
              
              {report.image_url && (
                <div className="rounded-xl overflow-hidden border border-white/5 h-20 w-full bg-slate-900">
                  <img src={report.image_url} alt="Evidence" className="w-full h-full object-cover" />
                </div>
              )}

              {report.verification_video_url && (
                <div className="rounded-xl overflow-hidden border border-white/5 w-full bg-slate-900 mt-2">
                  <video 
                    src={report.verification_video_url} 
                    controls 
                    className="w-full h-44 object-cover"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/5">
                {report.status === 'pending' && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRequestVerification(report); }} 
                      className="flex-1 rounded-xl bg-amber-500/10 border border-amber-500/20 py-2 text-[10px] font-bold text-amber-400 hover:bg-amber-500/20 transition"
                    >
                      Ask Video
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleQuickApprove(report); }} 
                      className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
                    >
                      Quick Appr
                    </button>
                  </>
                )}
                {report.status === 'verification_requested' && (
                  <div className="w-full flex items-center justify-center gap-2 py-2 text-[10px] text-amber-400 bg-amber-500/5 rounded-xl border border-amber-500/10">
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Waiting for 30s Live Video...
                  </div>
                )}
                {report.status === 'verified' && (
                  <>
                    {report.type === 'disaster' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleApproveDisaster(report); }} 
                        className="flex-1 rounded-xl bg-red-500/20 border border-red-500/30 py-2 text-[10px] font-bold text-red-400 hover:bg-red-500/30 transition"
                      >
                        Approve Danger
                      </button>
                    )}
                    {report.type === 'accident' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleApproveAccident(report); }} 
                        className="flex-1 rounded-xl bg-amber-500/20 border border-amber-500/30 py-2 text-[10px] font-bold text-amber-400 hover:bg-amber-500/30 transition"
                      >
                        Approve Accident
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDispatchAmbulance(report); }} 
                      className="flex-1 rounded-xl bg-blue-500/20 border border-blue-500/30 py-2 text-[10px] font-bold text-blue-400 hover:bg-blue-500/30 transition"
                    >
                      Send Ambulance
                    </button>
                  </>
                )}
                {report.status === 'dispatched' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMarkResolved(report); }} 
                    className="w-full rounded-xl bg-green-500/10 border border-green-500/20 py-2 text-[10px] font-bold text-green-400 hover:bg-green-500/20 transition"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredReports.length === 0 && (
            <div className="glass p-8 rounded-xl text-center text-xs text-white/30 border border-white/5">
              No reports active
            </div>
          )}
        </div>
      </div>

      {/* 2. Full Screen Map Area - right on desktop, top on mobile */}
      <div className="w-full lg:flex-1 h-[40vh] lg:h-full relative order-1 lg:order-2">
        <LeafletMap
          center={mapCenter}
          zoom={mapZoom}
          userLocation={null}
          dangerZones={reports
            .filter(d => d.type === 'disaster' && d.danger_zone)
            .map(d => ({
              id: d.id,
              center: d.danger_zone!.center,
              radius: d.danger_zone!.radius
            }))}
          safeRoutes={reports
            .filter(d => d.type === 'disaster' && d.safe_route)
            .map(d => ({
              id: d.id,
              path: d.safe_route!
            }))}
          accidents={reports
            .filter(r => r.status !== 'resolved')
            .map(a => ({
              id: a.id,
              latitude: a.latitude,
              longitude: a.longitude,
              description: a.description || undefined,
              image_url: a.image_url || undefined,
              verification_video_url: a.verification_video_url || undefined,
              hospital_qr_data: a.hospital_qr_data || undefined
            }))}
          ambulanceLocation={
            ambulanceTrackings.length > 0
              ? { lat: ambulanceTrackings[0].latitude, lng: ambulanceTrackings[0].longitude }
              : null
          }
          activeRoute={null}
        />
        <div className="absolute bottom-4 left-4 z-[1000] glass px-3 py-1.5 rounded-lg border border-white/10 text-[10px] text-white/50 pointer-events-none">
          Live Tracking Map (Admin View)
        </div>
      </div>
    </div>
  );
}
