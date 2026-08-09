'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AmbulanceTrack } from '@/lib/constants';

export function useAmbulanceTracking(reportId?: string) {
  const [tracking, setTracking] = useState<AmbulanceTrack | null>(null);

  useEffect(() => {
    if (!reportId) return;
    const supabase = createClient();

    const fetch = async () => {
      const { data } = await supabase
        .from('ambulance_tracking')
        .select('*')
        .eq('report_id', reportId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      if (data) setTracking(data as AmbulanceTrack);
    };

    fetch();

    const channel = supabase
      .channel(`ambulance-${reportId}-${Math.random()}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'ambulance_tracking',
        filter: `report_id=eq.${reportId}`,
      }, (payload) => {
        if (payload.new) setTracking(payload.new as AmbulanceTrack);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [reportId]);

  return tracking;
}
