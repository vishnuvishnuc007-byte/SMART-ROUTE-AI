'use client';
import { useState, useEffect } from 'react';

export function useGeolocation() {
  const [state, setState] = useState<{
    latitude: number | null;
    longitude: number | null;
    error: string | null;
    loading: boolean;
  }>({ latitude: null, longitude: null, error: null, loading: true });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(p => ({ ...p, error: 'Geolocation not supported', loading: false }));
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      (pos) => setState({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, error: null, loading: false }),
      (err) => setState(p => ({ ...p, error: err.message, loading: false })),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  return state;
}
