'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Report } from '@/lib/constants';
import { useRealtimeReports } from '@/hooks/useRealtimeReports';
import Link from 'next/link';

export default function HelpTeamDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const { reports } = useRealtimeReports();
  const [user, setUser] = useState<any>(null);

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
        
      if (!profile || (profile.role !== 'help_team' && profile.role !== 'admin')) {
        router.push('/home');
        return;
      }
      setUser(profile);
    };
    checkAuth();
  }, [router, supabase]);

  if (!user) return <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">Loading...</div>;

  const filteredReports = reports.filter(r => {
    return r.assigned_team_id === user.id || (r.status === 'dispatched' && !r.assigned_team_id);
  });

  const assignedCount = filteredReports.filter(r => r.assigned_team_id === user.id).length;
  const activeCount = filteredReports.filter(r => r.assigned_team_id === user.id && r.status !== 'resolved').length;
  const completedCount = filteredReports.filter(r => r.assigned_team_id === user.id && r.status === 'resolved').length;

  const handleAcceptAssignment = async (report: Report) => {
    await supabase.from('reports').update({ assigned_team_id: user.id }).eq('id', report.id);
  };

  const handleMarkArrived = async (report: Report) => {
    await supabase.from('ambulance_tracking').update({ status: 'arrived' }).eq('report_id', report.id);
  };

  const handleMarkCompleted = async (report: Report) => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'dispatched': return 'bg-purple-500/20 text-purple-500';
      case 'resolved': return 'bg-green-500/20 text-green-500';
      default: return 'bg-white/20 text-white';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'disaster' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500';
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center glass p-4 rounded-xl">
          <h1 className="text-2xl font-bold">Help Team Dashboard</h1>
          <Link href="/home" className="glass-strong px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition">
            Back to Map
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="glass p-4 rounded-xl text-center">
            <div className="text-3xl font-bold text-blue-500">{assignedCount}</div>
            <div className="text-sm text-neutral-400">Assigned to Me</div>
          </div>
          <div className="glass p-4 rounded-xl text-center">
            <div className="text-3xl font-bold text-amber-500">{activeCount}</div>
            <div className="text-sm text-neutral-400">Active</div>
          </div>
          <div className="glass p-4 rounded-xl text-center">
            <div className="text-3xl font-bold text-green-500">{completedCount}</div>
            <div className="text-sm text-neutral-400">Completed</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="glass p-5 rounded-xl space-y-4 flex flex-col">
              <div className="flex justify-between items-start">
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs uppercase tracking-wider font-bold ${getTypeColor(report.type)}`}>
                    {report.type}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs uppercase tracking-wider font-bold ${getStatusColor(report.status)}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm text-neutral-400">{new Date(report.created_at).toLocaleTimeString()}</div>
              </div>

              <p className="text-sm flex-1">{report.description}</p>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="glass-strong px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 flex items-center gap-2"
                >
                  📍 Map Link
                </a>
                
                {/* To get reporter's phone, normally we'd need to fetch profiles or have it on report. Assuming it's joined or we use a fallback */}
                <a 
                  href={`tel:${(report as any).profiles?.phone || ''}`}
                  className="glass-strong px-3 py-1.5 rounded-lg text-sm hover:bg-white/10 flex items-center gap-2"
                >
                  📞 Call User
                </a>

                {report.status === 'dispatched' && !report.assigned_team_id && (
                  <button onClick={() => handleAcceptAssignment(report)} className="glass-strong px-3 py-1.5 rounded-lg text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 ml-auto">
                    Accept Assignment
                  </button>
                )}

                {report.assigned_team_id === user.id && report.status === 'dispatched' && (
                  <button onClick={() => handleMarkArrived(report)} className="glass-strong px-3 py-1.5 rounded-lg text-sm bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 ml-auto">
                    Mark Arrived
                  </button>
                )}

                {report.assigned_team_id === user.id && report.status !== 'resolved' && (
                  <button onClick={() => handleMarkCompleted(report)} className="glass-strong px-3 py-1.5 rounded-lg text-sm bg-green-500/20 text-green-400 hover:bg-green-500/30 ml-auto">
                    Mark Completed
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredReports.length === 0 && (
            <div className="col-span-full glass p-8 rounded-xl text-center text-neutral-400">
              No reports assigned to you or waiting for a team.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
