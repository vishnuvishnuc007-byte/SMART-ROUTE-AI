export type ReportType = 'disaster' | 'accident';
export type ReportStatus = 'pending' | 'verification_requested' | 'verified' | 'dispatched' | 'resolved';
export type UserRole = 'user' | 'admin' | 'help_team';
export type AmbulanceStatus = 'dispatched' | 'en_route' | 'arrived';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  type: ReportType;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  from_location: string | null;
  to_location: string | null;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  verification_video_url: string | null;
  blurred_frame_url: string | null;
  danger_zone: { center: { lat: number; lng: number }; radius: number } | null;
  safe_route: { lat: number; lng: number }[] | null;
  assigned_team_id: string | null;
  hospital_qr_data: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; avatar_url: string; email: string; phone: string | null };
}

export interface AmbulanceTrack {
  id: string;
  report_id: string;
  latitude: number;
  longitude: number;
  eta_minutes: number | null;
  status: AmbulanceStatus;
  updated_at: string;
}
