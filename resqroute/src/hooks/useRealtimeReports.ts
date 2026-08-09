'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Report } from '@/lib/constants';

export function useRealtimeReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*, profiles!reporter_id(full_name, avatar_url, email, phone)')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Fetch reports error:', error);
      }
      if (data) setReports(data as Report[]);
      setLoading(false);
    };

    fetchReports();

    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { reports, loading };
}
