'use client';

import { useState } from 'react';

interface ProfileDrawerProps {
  userEmail?: string | null;
  userRole: string;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
}

export function ProfileDrawer({
  userEmail,
  userRole,
  onSignOut,
  onNavigate,
}: ProfileDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'account'>('guide');
  const [expandedSection, setExpandedSection] = useState<string | null>('route');

  const roleLabel =
    userRole === 'admin'
      ? 'Administrator'
      : userRole === 'help_team'
      ? 'Help Team Responder'
      : 'Civilian User';

  const roleBadgeColor =
    userRole === 'admin'
      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      : userRole === 'help_team'
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <>
      {/* Top Left Profile Circle Button */}
      <button
        onClick={() => setIsOpen(true)}
        title="Open Profile & User Guide"
        className="absolute top-5 left-5 z-[1200] group flex items-center gap-2.5 p-1.5 pr-3.5 rounded-full glass border border-white/15 shadow-2xl hover:bg-white/10 hover:border-white/30 transition-all duration-300 active:scale-95"
      >
        <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-danger via-warning to-emerald-400 p-[2px] shadow-lg">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-sm font-extrabold text-white">
            👤
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-[11px] font-bold text-white leading-none group-hover:text-emerald-400 transition-colors">
            Profile & Guide
          </span>
          <span className="text-[9px] text-white/40 font-medium">How to Use</span>
        </div>
      </button>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[9989] bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        />
      )}

      {/* Slide-out Left Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-[9990] w-80 sm:w-96 glass-strong border-r border-white/10 p-6 flex flex-col justify-between shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div>
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-danger to-warning p-[2px] shadow-lg">
                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center text-xl">
                  👤
                </div>
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white tracking-wide truncate max-w-[180px]">
                  {userEmail || 'User Profile'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${roleBadgeColor}`}
                  >
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 gap-2 my-5 p-1 rounded-xl bg-white/5 border border-white/5">
            <button
              onClick={() => setActiveTab('guide')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'guide'
                  ? 'bg-white/15 text-white shadow-md'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              📖 How to Use
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'account'
                  ? 'bg-white/15 text-white shadow-md'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              ⚙️ Account & Roles
            </button>
          </div>

          {/* TAB 1: HOW TO USE GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
              <p className="text-[11px] font-semibold text-white/50 mb-2 uppercase tracking-wider">
                Emergency Guide & Instructions
              </p>

              {/* Section 1: Route Planning */}
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-all">
                <button
                  onClick={() => toggleSection('route')}
                  className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-white hover:bg-white/5 transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">📍</span> 1. Planning Safe Routes
                  </span>
                  <span className="text-white/40">{expandedSection === 'route' ? '−' : '+'}</span>
                </button>
                {expandedSection === 'route' && (
                  <div className="px-3.5 pb-3.5 text-[11px] text-white/70 space-y-2 leading-relaxed border-t border-white/5 pt-2">
                    <p>
                      • <strong>Set From & To:</strong> Type any location name or click the map icon <span className="text-blue-400">📍</span> to click directly on the map.
                    </p>
                    <p>
                      • <strong>Current Location Button:</strong> Click the <span className="text-emerald-400">🎯 GPS icon</span> in the From box to automatically locate and center your position.
                    </p>
                    <p>
                      • <strong>Disaster Avoidance:</strong> Routes automatically detect active red disaster zones and compute safe green bypass routes around blocked areas.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 2: Reporting Emergencies */}
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-all">
                <button
                  onClick={() => toggleSection('report')}
                  className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-white hover:bg-white/5 transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🚨</span> 2. Reporting Emergencies
                  </span>
                  <span className="text-white/40">{expandedSection === 'report' ? '−' : '+'}</span>
                </button>
                {expandedSection === 'report' && (
                  <div className="px-3.5 pb-3.5 text-[11px] text-white/70 space-y-2 leading-relaxed border-t border-white/5 pt-2">
                    <p>
                      • <strong>Disaster Issue:</strong> Report floods, fires, or earthquakes. Generates a circular danger zone to warn other drivers on the map.
                    </p>
                    <p>
                      • <strong>Accident Case:</strong> Report road accidents. Attach photo evidence, hospital QR codes, or video recordings for emergency responders.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 3: Live Verification */}
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-all">
                <button
                  onClick={() => toggleSection('verify')}
                  className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-white hover:bg-white/5 transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">📹</span> 3. 30-Sec Live Verification
                  </span>
                  <span className="text-white/40">{expandedSection === 'verify' ? '−' : '+'}</span>
                </button>
                {expandedSection === 'verify' && (
                  <div className="px-3.5 pb-3.5 text-[11px] text-white/70 space-y-2 leading-relaxed border-t border-white/5 pt-2">
                    <p>
                      • When requested by the control room, an incoming call prompt will appear on your screen.
                    </p>
                    <p>
                      • Accept the call to record a brief <strong>30-second live camera video</strong> of the emergency scene for instant verification.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 4: Rescue & Ambulance Tracking */}
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-all">
                <button
                  onClick={() => toggleSection('rescue')}
                  className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-white hover:bg-white/5 transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">🚑</span> 4. Rescue & Dispatch
                  </span>
                  <span className="text-white/40">{expandedSection === 'rescue' ? '−' : '+'}</span>
                </button>
                {expandedSection === 'rescue' && (
                  <div className="px-3.5 pb-3.5 text-[11px] text-white/70 space-y-2 leading-relaxed border-t border-white/5 pt-2">
                    <p>
                      • Once verified, emergency response teams dispatch ambulances to the exact GPS location.
                    </p>
                    <p>
                      • Track dispatched ambulances live on the map in real-time.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ACCOUNT & ROLE DASHBOARDS */}
          {activeTab === 'account' && (
            <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-medium">Logged in as</span>
                  <span className="text-xs font-bold text-white truncate max-w-[150px]">
                    {userEmail || 'User'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-medium">Account Role</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${roleBadgeColor}`}
                  >
                    {userRole}
                  </span>
                </div>
              </div>

              {/* Special Dashboard Access Buttons */}
              {userRole === 'admin' && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('/admin');
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300 font-bold text-xs hover:bg-purple-600/35 transition flex items-center justify-center gap-2"
                >
                  <span>⚙️ Open Admin Command Center</span>
                </button>
              )}

              {(userRole === 'help_team' || userRole === 'admin') && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('/help-team');
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-300 font-bold text-xs hover:bg-blue-600/35 transition flex items-center justify-center gap-2"
                >
                  <span>🛡️ Open Help Team Dashboard</span>
                </button>
              )}

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
                <span className="font-bold block mb-1">📞 Emergency Hotline</span>
                For life-threatening emergencies, call national response lines:
                <div className="mt-1 font-extrabold text-white flex gap-4">
                  <span>🚑 Ambulance: 108</span>
                  <span>🚨 Police: 112</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer / Sign Out */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <button
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-danger/20 hover:bg-danger/35 border border-danger/30 text-red-400 font-bold text-xs transition flex items-center justify-center gap-2 active:scale-95"
          >
            <span>🚪 Sign Out</span>
          </button>
          <div className="text-center text-[10px] text-white/30 font-medium">
            SMART ROUTE AI v1.0 • Emergency Response System
          </div>
        </div>
      </div>
    </>
  );
}
