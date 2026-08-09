-- ResQRoute V2 Database Schema
create extension if not exists "uuid-ossp";

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  role text default 'user' check (role in ('user', 'admin', 'help_team')),
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Profiles viewable by all" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- ============ REPORTS ============
create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('disaster', 'accident')),
  status text default 'pending' check (status in ('pending', 'verification_requested', 'verified', 'dispatched', 'resolved')),
  latitude double precision not null,
  longitude double precision not null,
  from_location text,
  to_location text,
  description text,
  image_url text,
  video_url text,
  verification_video_url text,
  blurred_frame_url text,
  danger_zone jsonb,
  safe_route jsonb,
  assigned_team_id uuid references public.profiles(id) on delete set null,
  hospital_qr_data text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.reports enable row level security;

create policy "Reports viewable by all" on public.reports for select using (true);
create policy "Auth users create reports" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "Admins update any report" on public.reports for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Help team update assigned" on public.reports for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'help_team')
  and assigned_team_id = auth.uid()
);
create policy "Reporters update own" on public.reports for update using (auth.uid() = reporter_id);

-- ============ AMBULANCE TRACKING ============
create table if not exists public.ambulance_tracking (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.reports(id) on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  eta_minutes double precision,
  status text default 'dispatched' check (status in ('dispatched', 'en_route', 'arrived')),
  updated_at timestamptz default now() not null
);

alter table public.ambulance_tracking enable row level security;
create policy "Tracking viewable by all" on public.ambulance_tracking for select using (true);
create policy "Admins manage tracking" on public.ambulance_tracking for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Help team manage tracking" on public.ambulance_tracking for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'help_team')
);

-- ============ TRIGGERS ============
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_report_updated before update on public.reports
  for each row execute procedure public.handle_updated_at();

create trigger on_tracking_updated before update on public.ambulance_tracking
  for each row execute procedure public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ REALTIME ============
alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.ambulance_tracking;

-- ============ STORAGE ============
insert into storage.buckets (id, name, public) values ('evidence', 'evidence', true)
  on conflict (id) do nothing;

drop policy if exists "Public read evidence" on storage.objects;
create policy "Public read evidence" on storage.objects for select using (bucket_id = 'evidence');

drop policy if exists "Auth upload evidence" on storage.objects;
create policy "Auth upload evidence" on storage.objects for insert with check (
  bucket_id = 'evidence' and auth.role() = 'authenticated'
);
