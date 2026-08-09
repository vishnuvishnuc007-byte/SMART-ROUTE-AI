'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { blurImage } from '@/lib/blur';
import { useAmbulanceTracking } from '@/hooks/useAmbulanceTracking';
import type { Report } from '@/lib/constants';

interface AccidentOverlayProps {
  report: Report;
  onClose: () => void;
}

export function AccidentOverlay({ report, onClose }: AccidentOverlayProps) {
  const [unblur, setUnblur] = useState(false);
  const tracking = useAmbulanceTracking(report.id);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = !!report.verification_video_url;
  const mediaUrl = report.verification_video_url || report.image_url;

  useEffect(() => {
    if (hasVideo && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.log('Overlay video play caught and bypassed:', err.message);
      });
    }
  }, [mediaUrl, hasVideo]);

  return (
    <div className="absolute bottom-20 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-[26rem] z-[1000] animate-slide-up">
      <div className="glass-strong max-w-xl mx-auto overflow-hidden">
        {/* VERIFIED LIVE Badge */}
        <div className="flex items-center justify-between px-4 py-2 bg-danger/10 border-b border-danger/20">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">⚡ Verified Live</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-xs transition">✕</button>
        </div>

        {/* Blurred Accident Image/Video - LARGE */}
        {mediaUrl ? (
          <div className="relative h-44 sm:h-52 overflow-hidden bg-slate-900 group">
            {hasVideo ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                muted
                loop
                playsInline
                className={`w-full h-full object-cover transition-all duration-500 ${unblur ? 'blur-0 scale-100' : 'blur-xl scale-105'}`}
              />
            ) : (
              <img
                src={mediaUrl}
                alt="Accident scene"
                className={`w-full h-full object-cover transition-all duration-500 ${unblur ? 'blur-0 scale-100' : 'blur-xl scale-105'}`}
              />
            )}
            
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />

            {/* Click to Unblur Overlay Button */}
            {!unblur && (
              <button 
                onClick={() => setUnblur(true)}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 hover:bg-black/55 transition-colors cursor-pointer"
              >
                <div className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 p-2.5 mb-2 shadow-lg hover:bg-white/20 transition-all">
                  <span className="text-lg">👁️</span>
                </div>
                <span className="text-[10px] font-bold text-white tracking-wide uppercase">Click to Reveal Media</span>
                <span className="text-[8px] text-white/50 mt-0.5">Warning: Sensitive content</span>
              </button>
            )}

            {/* Click to Blur Again Option */}
            {unblur && (
              <button 
                onClick={() => setUnblur(false)}
                className="absolute top-2 right-2 z-10 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 text-[9px] font-bold text-white/70 hover:text-white transition"
              >
                Hide Media
              </button>
            )}

            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>⚠️</span> Accident Scene
                </p>
                <p className="text-[10px] text-white/60 line-clamp-1">{report.description || 'Road accident ahead'}</p>
              </div>
              <div className="flex h-7 items-center gap-1 rounded-lg bg-danger/20 border border-danger/30 px-2">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-bold text-red-400">LIVE</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-44 sm:h-52 flex items-center justify-center bg-danger/5">
            <div className="text-center">
              <span className="text-4xl">⚠️</span>
              <p className="text-xs text-white/40 mt-2">Accident Ahead</p>
            </div>
          </div>
        )}

        {/* Info Bar */}
        <div className="px-4 py-3 grid grid-cols-3 gap-2">
          {/* Drive Slowly Warning */}
          <div className="rounded-xl bg-warning/10 border border-warning/20 px-2 py-2 text-center">
            <span className="text-lg">🐌</span>
            <p className="text-[8px] font-bold uppercase text-amber-400 mt-0.5">Drive Slow</p>
          </div>

          {/* Ambulance ETA */}
          <div className="rounded-xl bg-info/10 border border-info/20 px-2 py-2 text-center">
            <span className="text-lg">🚑</span>
            <p className="text-[8px] font-bold text-blue-400 mt-0.5">
              {tracking ? `ETA ${tracking.eta_minutes?.toFixed(0) || '?'} min` : 'Dispatching'}
            </p>
          </div>

          {/* Hospital QR */}
          <div className="rounded-xl bg-accent/10 border border-accent/20 px-2 py-2 text-center">
            <span className="text-lg">🏥</span>
            <p className="text-[8px] font-bold text-purple-400 mt-0.5">Support QR</p>
          </div>
        </div>

        {/* Hospital QR Code Expand */}
        {report.hospital_qr_data && (
          <div className="px-4 pb-3 flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg">
              <QRCodeSVG value={report.hospital_qr_data} size={64} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Hospital Support</p>
              <p className="text-[10px] text-white/40">Scan to contribute to treatment</p>
            </div>
          </div>
        )}

        {/* Ambulance Status Bar */}
        {tracking && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 rounded-xl bg-info/5 border border-info/10 px-3 py-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] text-blue-400 font-medium">
                🚑 Ambulance {tracking.status === 'en_route' ? 'en route' : tracking.status} — ETA {tracking.eta_minutes?.toFixed(0) || '?'} min
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
