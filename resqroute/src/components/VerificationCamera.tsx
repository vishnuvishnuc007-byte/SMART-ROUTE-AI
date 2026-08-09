'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface VerificationCameraProps {
  reportId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function VerificationCamera({ reportId, onComplete, onCancel }: VerificationCameraProps) {
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecordingDirectly = (stream: MediaStream) => {
    try {
      chunksRef.current = [];
      let options = { mimeType: 'video/webm' };
      
      // Fallbacks for iOS Safari and other browsers
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('video/webm')) {
          if (MediaRecorder.isTypeSupported('video/mp4')) {
            options = { mimeType: 'video/mp4' };
          } else {
            options = { mimeType: '' }; // default browser mimeType
          }
        }
        
        const mr = new MediaRecorder(stream, options);
        mr.ondataavailable = (e) => { 
          if (e.data.size > 0) chunksRef.current.push(e.data); 
        };
        mr.onstop = () => uploadVideo();
        mr.start();
        mediaRecorderRef.current = mr;
        setRecording(true);
        setCountdown(30);
      }
    } catch (err) {
      console.error('Error starting MediaRecorder:', err);
    }
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Automatically trigger recording once stream is ready
      startRecordingDirectly(stream);
    } catch (err) {
      console.error('Camera error:', err);
      alert('Camera access is required for verification.');
    }
  }, []);

  useEffect(() => { 
    startCamera(); 
    return () => { 
      streamRef.current?.getTracks().forEach(t => t.stop()); 
    }; 
  }, [startCamera]);

  useEffect(() => {
    if (!recording) return;
    if (countdown <= 0) { 
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop(); 
      }
      setRecording(false); 
      return; 
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [recording, countdown]);

  const uploadVideo = async () => {
    setUploading(true);
    const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const path = `verification/${reportId}/${Date.now()}.${ext}`;
    const { data } = await supabase.storage.from('evidence').upload(path, blob);
    if (data) {
      const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(data.path);
      await supabase.from('reports').update({ 
        verification_video_url: urlData.publicUrl, 
        status: 'verified' 
      }).eq('id', reportId);
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    setUploading(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Video Feed */}
      <div className="flex-1 relative">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        
        {/* Countdown overlay */}
        {recording && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 glass px-4 py-2 bg-slate-900/80 border border-white/10 rounded-full shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-sm font-bold text-white">{countdown}s</span>
            <span className="text-xs text-white/50">Recording Verification...</span>
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="text-center">
              <div className="h-8 w-8 mx-auto border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-xs text-white/60 mt-3">Uploading 30s verification video...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="glass-strong p-4 flex items-center justify-between border-t border-white/10 bg-slate-950/95">
        <button onClick={onCancel} className="rounded-xl bg-white/5 border border-white/10 px-5 py-3 text-xs font-medium text-white/60 hover:text-white transition">
          Cancel
        </button>
        <div className="text-center">
          <p className="text-[10px] text-white/40 mb-1">Auto-Recording (30 Seconds Max)</p>
          {recording && (
            <button 
              onClick={() => { 
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                  mediaRecorderRef.current.stop(); 
                }
                setRecording(false); 
              }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-danger border-4 border-danger/30 text-white active:scale-95 transition"
            >
              <div className="h-5 w-5 rounded-sm bg-white animate-pulse" />
            </button>
          )}
        </div>
        <div className="w-16" />
      </div>
    </div>
  );
}
