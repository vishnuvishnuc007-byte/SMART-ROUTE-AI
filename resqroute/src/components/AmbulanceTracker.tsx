'use client';

import type { AmbulanceTrack, Report } from '@/lib/constants';

interface AmbulanceTrackerProps {
  tracking: AmbulanceTrack;
  report: Report;
}

export function AmbulanceTracker({ tracking, report }: AmbulanceTrackerProps) {
  const statusText = {
    dispatched: 'Ambulance dispatched',
    en_route: 'Ambulance en route',
    arrived: 'Ambulance arrived',
  };

  const statusColor = {
    dispatched: 'text-amber-400',
    en_route: 'text-blue-400',
    arrived: 'text-green-400',
  };

  return (
    <div className="absolute bottom-2 left-4 right-4 lg:right-[26rem] z-[1000] animate-slide-up">
      <div className="glass flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/20">
            <span className="text-xl">🚑</span>
          </div>
          <div>
            <p className={`text-xs font-bold ${statusColor[tracking.status]}`}>
              {statusText[tracking.status]}
            </p>
            <p className="text-[10px] text-white/40">
              {report.description || 'Emergency response active'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">
            {tracking.eta_minutes ? `${tracking.eta_minutes.toFixed(0)} min` : '...'}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-white/30">ETA</p>
        </div>
      </div>
    </div>
  );
}
