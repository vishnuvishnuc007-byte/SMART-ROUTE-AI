'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ReportModalProps {
  type: 'disaster' | 'accident';
  latitude: number | null;
  longitude: number | null;
  onClose: () => void;
}

export function ReportModal({ type, latitude, longitude, onClose }: ReportModalProps) {
  const [subType, setSubType] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!latitude || !longitude || !subType) return;
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let imageUrl: string | null = null;
    let videoUrl: string | null = null;

    // Upload image
    if (image) {
      const ext = image.name.split('.').pop();
      const path = `reports/${user.id}/${Date.now()}.${ext}`;
      const { data } = await supabase.storage.from('evidence').upload(path, image);
      if (data) {
        const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(data.path);
        imageUrl = urlData.publicUrl;
      }
    }

    // Upload video
    if (video) {
      const ext = video.name.split('.').pop();
      const path = `reports/${user.id}/${Date.now()}-video.${ext}`;
      const { data } = await supabase.storage.from('evidence').upload(path, video);
      if (data) {
        const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(data.path);
        videoUrl = urlData.publicUrl;
      }
    }

    const finalDescription = `[Type: ${subType}] ${description}`.trim();

    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: user.id,
      type,
      status: 'pending',
      latitude,
      longitude,
      description: finalDescription,
      image_url: imageUrl,
      video_url: videoUrl,
    });

    if (insertError) {
      console.error('Insert report error:', insertError);
      alert('Failed to submit report: ' + insertError.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end sm:items-center sm:justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="glass-strong h-screen sm:h-auto w-[85%] sm:w-full max-w-md p-6 overflow-y-auto sm:overflow-visible animate-slide-in-right sm:animate-slide-up rounded-l-3xl rounded-r-none sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        {success ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-lg font-bold text-white">Report Submitted!</p>
            <p className="text-xs text-white/40 mt-1">Emergency team has been notified</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${type === 'disaster' ? 'bg-danger/20' : 'bg-warning/20'}`}>
                  <span className="text-xl">{type === 'disaster' ? '🔥' : '🚗'}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Report {type === 'disaster' ? 'Disaster' : 'Accident'}</p>
                  <p className="text-[10px] text-white/30">
                    📍 {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40 hover:text-white transition">✕</button>
            </div>

            {/* SubType Select */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-white/50 mb-1">
                Select {type === 'disaster' ? 'Disaster' : 'Accident'} Type
              </label>
              <select
                value={subType}
                onChange={e => setSubType(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-xs text-white placeholder-white/20 outline-none focus:border-white/20 transition-all"
              >
                <option value="">-- Choose type --</option>
                {type === 'disaster'
                  ? ['Flood', 'Fire', 'Earthquake', 'Landslide', 'Storm', 'Other'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))
                  : ['Car Accident', 'Bike Accident', 'Pedestrian Injury', 'Industrial Accident', 'Other'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))
                }
              </select>
            </div>

            {/* Description */}
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the emergency..."
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white placeholder-white/20 outline-none focus:border-white/20 resize-none transition-all mb-3"
            />

            {/* Media */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => imageRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 bg-white/5 py-3 text-xs text-white/40 hover:text-white/60 hover:border-white/20 transition">
                📷 {image ? image.name.slice(0, 15) : 'Add Photo'}
              </button>
              <button onClick={() => videoRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 bg-white/5 py-3 text-xs text-white/40 hover:text-white/60 hover:border-white/20 transition">
                🎥 {video ? video.name.slice(0, 15) : 'Add Video'}
              </button>
            </div>

            <input ref={imageRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
            <input ref={videoRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={e => setVideo(e.target.files?.[0] || null)} />

            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-4 rounded-xl overflow-hidden border border-white/10">
                <img src={imagePreview} alt="Evidence" className="w-full h-32 object-cover" />
              </div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting || !subType || !description}
              className={`w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all ${type === 'disaster' ? 'gradient-danger border border-danger/30 hover:border-danger/50' : 'bg-gradient-to-r from-warning/15 to-warning/5 border border-warning/30 hover:border-warning/50'} disabled:opacity-40`}>
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Submitting...
                </div>
              ) : (
                `Submit ${type === 'disaster' ? 'Disaster' : 'Accident'} Report`
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
