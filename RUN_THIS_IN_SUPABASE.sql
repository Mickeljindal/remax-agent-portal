-- =================================================================
-- COMPLETE DATABASE SETUP — RUN THIS ENTIRE FILE ONCE IN SUPABASE SQL EDITOR
-- Safe to re-run. Creates everything for the RE/MAX Agent Portal.
-- =================================================================

-- ─── Helper function ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ─── Roles enum + has_role ─────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'agent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ─── Agents (already created, ensure columns) ──────────────────
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  reco_number VARCHAR(20) NOT NULL UNIQUE,
  full_name TEXT, email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Agents policies (drop-then-create to be safe)
DROP POLICY IF EXISTS "Agents can view their own profile" ON public.agents;
DROP POLICY IF EXISTS "Agents can update their own profile" ON public.agents;
DROP POLICY IF EXISTS "Agents can insert their own profile" ON public.agents;
DROP POLICY IF EXISTS "Admins can view all agents" ON public.agents;
DROP POLICY IF EXISTS "Admins can update all agents" ON public.agents;
DROP POLICY IF EXISTS "Admins can delete agents" ON public.agents;
CREATE POLICY "Agents can view their own profile" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Agents can update their own profile" ON public.agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Agents can insert their own profile" ON public.agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all agents" ON public.agents FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all agents" ON public.agents FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete agents" ON public.agents FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Agents can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Agents can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Agents can delete their own avatar" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Agents can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Agents can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Agents can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─── Resource links & content views ───────────────────────────
CREATE TABLE IF NOT EXISTS public.resource_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), resource_key VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL, description TEXT, category VARCHAR(100) NOT NULL,
  drive_url TEXT, is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  resource_key VARCHAR(100) NOT NULL, viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_seconds INTEGER DEFAULT 0, session_id VARCHAR(100)
);
ALTER TABLE public.resource_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active resource links" ON public.resource_links;
DROP POLICY IF EXISTS "Admins can insert resource links" ON public.resource_links;
DROP POLICY IF EXISTS "Admins can update resource links" ON public.resource_links;
DROP POLICY IF EXISTS "Admins can delete resource links" ON public.resource_links;
CREATE POLICY "Anyone can view active resource links" ON public.resource_links FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert resource links" ON public.resource_links FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update resource links" ON public.resource_links FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete resource links" ON public.resource_links FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Agents can insert their own views" ON public.content_views;
DROP POLICY IF EXISTS "Agents can view their own activity" ON public.content_views;
DROP POLICY IF EXISTS "Admins can view all content views" ON public.content_views;
CREATE POLICY "Agents can insert their own views" ON public.content_views FOR INSERT WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents can view their own activity" ON public.content_views FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all content views" ON public.content_views FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS update_resource_links_updated_at ON public.resource_links;
CREATE TRIGGER update_resource_links_updated_at BEFORE UPDATE ON public.resource_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_content_views_agent_id ON public.content_views(agent_id);
CREATE INDEX IF NOT EXISTS idx_content_views_resource_key ON public.content_views(resource_key);

-- ─── Announcements & shared documents ──────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
  author_id UUID NOT NULL, is_pinned BOOLEAN NOT NULL DEFAULT false, is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Anyone authenticated can view active announcements" ON public.announcements FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.shared_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, title TEXT NOT NULL, description TEXT,
  file_url TEXT NOT NULL, file_name TEXT NOT NULL, file_size BIGINT, category TEXT NOT NULL DEFAULT 'General',
  uploaded_by UUID NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone authenticated can view active documents" ON public.shared_documents;
DROP POLICY IF EXISTS "Admins can manage documents" ON public.shared_documents;
CREATE POLICY "Anyone authenticated can view active documents" ON public.shared_documents FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage documents" ON public.shared_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_shared_documents_updated_at ON public.shared_documents;
CREATE TRIGGER update_shared_documents_updated_at BEFORE UPDATE ON public.shared_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
CREATE POLICY "Authenticated users can view documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Admins can upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'));

-- ─── Events, Courses, Precon, Support, Rooms ───────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text,
  event_date timestamp with time zone NOT NULL, end_date timestamp with time zone, location text,
  event_type text NOT NULL DEFAULT 'general', created_by uuid NOT NULL, is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
DROP POLICY IF EXISTS "Authenticated can view active events" ON public.events;
CREATE POLICY "Admins can manage events" ON public.events FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view active events" ON public.events FOR SELECT TO authenticated USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL, status text NOT NULL DEFAULT 'attending',
  notify_email boolean NOT NULL DEFAULT false, created_at timestamp with time zone NOT NULL DEFAULT now(), UNIQUE(event_id, agent_id)
);
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agents can manage own RSVPs" ON public.event_rsvps;
DROP POLICY IF EXISTS "Admins can view all RSVPs" ON public.event_rsvps;
CREATE POLICY "Agents can manage own RSVPs" ON public.event_rsvps FOR ALL TO authenticated USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())) WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all RSVPs" ON public.event_rsvps FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text, thumbnail_url text,
  category text NOT NULL DEFAULT 'General', is_mandatory boolean NOT NULL DEFAULT false, is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0, created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated can view active courses" ON public.courses;
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view active courses" ON public.courses FOR SELECT TO authenticated USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL, description text, module_type text NOT NULL DEFAULT 'video', video_url text, content jsonb,
  duration_minutes int, sort_order int NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  storage_path text, created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage modules" ON public.course_modules;
DROP POLICY IF EXISTS "Authenticated can view active modules" ON public.course_modules;
CREATE POLICY "Admins can manage modules" ON public.course_modules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view active modules" ON public.course_modules FOR SELECT TO authenticated USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES public.course_modules(id) ON DELETE CASCADE NOT NULL, completed boolean NOT NULL DEFAULT false,
  score int, watched_seconds int NOT NULL DEFAULT 0, completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(), UNIQUE(agent_id, module_id)
);
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agents can manage own progress" ON public.course_progress;
DROP POLICY IF EXISTS "Admins can view all progress" ON public.course_progress;
CREATE POLICY "Agents can manage own progress" ON public.course_progress FOR ALL TO authenticated USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())) WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all progress" ON public.course_progress FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.precon_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, developer text, location text, description text,
  price_range text, thumbnail_url text, status text NOT NULL DEFAULT 'selling', external_url text,
  is_active boolean NOT NULL DEFAULT true, created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.precon_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage precon" ON public.precon_projects;
DROP POLICY IF EXISTS "Authenticated can view active precon" ON public.precon_projects;
CREATE POLICY "Admins can manage precon" ON public.precon_projects FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view active precon" ON public.precon_projects FOR SELECT TO authenticated USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.precon_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid REFERENCES public.precon_projects(id) ON DELETE CASCADE,
  title text NOT NULL, asset_type text NOT NULL DEFAULT 'general', file_url text NOT NULL, file_name text NOT NULL,
  category text NOT NULL DEFAULT 'General', is_active boolean NOT NULL DEFAULT true, created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.precon_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage precon assets" ON public.precon_assets;
DROP POLICY IF EXISTS "Authenticated can view active precon assets" ON public.precon_assets;
CREATE POLICY "Admins can manage precon assets" ON public.precon_assets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view active precon assets" ON public.precon_assets FOR SELECT TO authenticated USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL, category text NOT NULL DEFAULT 'general', status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal', created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agents can manage own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
CREATE POLICY "Agents can manage own tickets" ON public.support_tickets FOR ALL TO authenticated USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())) WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all tickets" ON public.support_tickets FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL, message text NOT NULL, is_admin boolean NOT NULL DEFAULT false, created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ticket participants can view messages" ON public.support_messages;
DROP POLICY IF EXISTS "Authenticated can insert messages" ON public.support_messages;
CREATE POLICY "Ticket participants can view messages" ON public.support_messages FOR SELECT TO authenticated USING (ticket_id IN (SELECT id FROM support_tickets WHERE agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert messages" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (ticket_id IN (SELECT id FROM support_tickets WHERE agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())) OR has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.office_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, address text, phone text,
  is_active boolean NOT NULL DEFAULT true, sort_order int NOT NULL DEFAULT 0, created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.office_locations;
DROP POLICY IF EXISTS "Authenticated can view active locations" ON public.office_locations;
CREATE POLICY "Admins can manage locations" ON public.office_locations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view active locations" ON public.office_locations FOR SELECT TO authenticated USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.meeting_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), location_id uuid REFERENCES public.office_locations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL, capacity int, amenities text, is_virtual boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true, created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage rooms" ON public.meeting_rooms;
DROP POLICY IF EXISTS "Authenticated can view active rooms" ON public.meeting_rooms;
CREATE POLICY "Admins can manage rooms" ON public.meeting_rooms FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view active rooms" ON public.meeting_rooms FOR SELECT TO authenticated USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.room_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid REFERENCES public.meeting_rooms(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL, title text NOT NULL,
  start_time timestamp with time zone NOT NULL, end_time timestamp with time zone NOT NULL,
  is_virtual boolean NOT NULL DEFAULT false, meeting_link text, status text NOT NULL DEFAULT 'confirmed', created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agents can manage own bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Authenticated can view all bookings" ON public.room_bookings;
CREATE POLICY "Agents can manage own bookings" ON public.room_bookings FOR ALL TO authenticated USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())) WITH CHECK (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all bookings" ON public.room_bookings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view all bookings" ON public.room_bookings FOR SELECT TO authenticated USING (true);

-- Course videos & precon assets buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('course-videos', 'course-videos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('precon-assets', 'precon-assets', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Admin upload course videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view course videos" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload precon assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view precon assets" ON storage.objects;
CREATE POLICY "Admin upload course videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-videos' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view course videos" ON storage.objects FOR SELECT USING (bucket_id = 'course-videos');
CREATE POLICY "Admin upload precon assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'precon-assets' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view precon assets" ON storage.objects FOR SELECT USING (bucket_id = 'precon-assets');

-- ─── Vendors ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category text NOT NULL, business_name text NOT NULL,
  contact_name text, phone text, email text, website text, notes text, is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0, created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated can view active vendors" ON public.vendors;
CREATE POLICY "Admins can manage vendors" ON public.vendors FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view active vendors" ON public.vendors FOR SELECT TO authenticated USING (is_active = true);
DROP TRIGGER IF EXISTS update_vendors_updated_at ON public.vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Precon cities + project extensions ────────────────────────
CREATE TABLE IF NOT EXISTS public.precon_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true, created_at timestamp with time zone NOT NULL DEFAULT now(), UNIQUE (name)
);
ALTER TABLE public.precon_cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage precon cities" ON public.precon_cities;
DROP POLICY IF EXISTS "Authenticated view active precon cities" ON public.precon_cities;
CREATE POLICY "Admins manage precon cities" ON public.precon_cities FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated view active precon cities" ON public.precon_cities FOR SELECT TO authenticated USING (is_active = true);

ALTER TABLE public.precon_projects ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.precon_cities(id) ON DELETE SET NULL;
ALTER TABLE public.precon_projects ADD COLUMN IF NOT EXISTS property_type text NOT NULL DEFAULT 'condo';
ALTER TABLE public.precon_projects ADD COLUMN IF NOT EXISTS commission_rate_percent numeric(5,2);
ALTER TABLE public.precon_projects ADD COLUMN IF NOT EXISTS gallery_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.precon_projects ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.precon_projects ADD COLUMN IF NOT EXISTS commission_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.precon_projects ADD COLUMN IF NOT EXISTS is_new boolean DEFAULT false;
ALTER TABLE public.precon_projects ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE public.precon_projects ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Agent portal settings
CREATE TABLE IF NOT EXISTS public.agent_portal_settings (
  agent_id uuid PRIMARY KEY REFERENCES public.agents(id) ON DELETE CASCADE,
  hide_commission_rates boolean NOT NULL DEFAULT false, updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_portal_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agents manage own portal settings" ON public.agent_portal_settings;
DROP POLICY IF EXISTS "Admins view all portal settings" ON public.agent_portal_settings;
CREATE POLICY "Agents manage own portal settings" ON public.agent_portal_settings FOR ALL TO authenticated USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())) WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Admins view all portal settings" ON public.agent_portal_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Course assignments
CREATE TABLE IF NOT EXISTS public.course_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE, assigned_by uuid NOT NULL, note text,
  due_at timestamp with time zone, created_at timestamp with time zone NOT NULL DEFAULT now(), UNIQUE (course_id, agent_id)
);
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage course assignments" ON public.course_assignments;
DROP POLICY IF EXISTS "Agents view own assignments" ON public.course_assignments;
CREATE POLICY "Admins manage course assignments" ON public.course_assignments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents view own assignments" ON public.course_assignments FOR SELECT TO authenticated USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Agent reminders
CREATE TABLE IF NOT EXISTS public.agent_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  title text NOT NULL, body text, remind_at timestamp with time zone NOT NULL DEFAULT now(),
  entity_type text NOT NULL DEFAULT 'general', entity_id uuid, created_by uuid NOT NULL,
  dismissed boolean NOT NULL DEFAULT false, created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage agent reminders" ON public.agent_reminders;
DROP POLICY IF EXISTS "Agents view own reminders" ON public.agent_reminders;
DROP POLICY IF EXISTS "Agents dismiss own reminders" ON public.agent_reminders;
CREATE POLICY "Admins manage agent reminders" ON public.agent_reminders FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents view own reminders" ON public.agent_reminders FOR SELECT TO authenticated USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents dismiss own reminders" ON public.agent_reminders FOR UPDATE TO authenticated USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())) WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));

-- Social share settings
CREATE TABLE IF NOT EXISTS public.portal_social_share_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  share_whatsapp_enabled boolean NOT NULL DEFAULT true, share_facebook_enabled boolean NOT NULL DEFAULT true,
  share_linkedin_enabled boolean NOT NULL DEFAULT true, share_x_enabled boolean NOT NULL DEFAULT false,
  share_email_enabled boolean NOT NULL DEFAULT true, share_copy_link_enabled boolean NOT NULL DEFAULT true,
  share_native_enabled boolean NOT NULL DEFAULT true, updated_at timestamp with time zone NOT NULL DEFAULT now()
);
INSERT INTO public.portal_social_share_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.portal_social_share_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_social_share_settings_select" ON public.portal_social_share_settings;
DROP POLICY IF EXISTS "portal_social_share_settings_admin_update" ON public.portal_social_share_settings;
CREATE POLICY "portal_social_share_settings_select" ON public.portal_social_share_settings FOR SELECT USING (true);
CREATE POLICY "portal_social_share_settings_admin_update" ON public.portal_social_share_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Precon agent notes
CREATE TABLE IF NOT EXISTS public.precon_agent_project_notes (
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.precon_projects(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '', updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, project_id)
);
ALTER TABLE public.precon_agent_project_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agents manage own precon listing notes" ON public.precon_agent_project_notes;
DROP POLICY IF EXISTS "Admins read all precon listing notes" ON public.precon_agent_project_notes;
CREATE POLICY "Agents manage own precon listing notes" ON public.precon_agent_project_notes FOR ALL TO authenticated USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())) WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Admins read all precon listing notes" ON public.precon_agent_project_notes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- PART 3: NEW FEATURES (notifications, certificates, properties, tags)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient_email text NOT NULL, recipient_name text,
  recipient_agent_id uuid REFERENCES public.agents(id), notification_type text NOT NULL, subject text NOT NULL,
  body text NOT NULL, metadata jsonb DEFAULT '{}', status text NOT NULL DEFAULT 'pending', error_message text,
  created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid NOT NULL REFERENCES public.agents(id),
  course_id uuid NOT NULL REFERENCES public.courses(id), certificate_number text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(), agent_name text NOT NULL, reco_number text NOT NULL,
  course_title text NOT NULL, total_watch_time_seconds integer DEFAULT 0, UNIQUE(agent_id, course_id)
);
CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admin_user_id uuid NOT NULL,
  notify_agent_signup boolean DEFAULT true, notify_course_completion boolean DEFAULT true,
  notify_support_ticket boolean DEFAULT true, email_override text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(admin_user_id)
);
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, address text NOT NULL, city text,
  province text DEFAULT 'Ontario', postal_code text, property_type text NOT NULL DEFAULT 'Residential',
  listing_type text NOT NULL DEFAULT 'Sale', price numeric, bedrooms integer, bathrooms numeric, square_feet integer,
  lot_size text, year_built integer, description text, features text[], mls_number text, status text NOT NULL DEFAULT 'Active',
  thumbnail_url text, gallery_urls jsonb DEFAULT '[]', assigned_agent_id uuid REFERENCES public.agents(id),
  created_by text NOT NULL, is_active boolean DEFAULT true, listed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_id uuid NOT NULL REFERENCES public.agents(id),
  title text NOT NULL, body text, type text NOT NULL DEFAULT 'info', link text, is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_agent ON public.in_app_notifications(agent_id, is_read, created_at DESC);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_attendees integer;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recurrence_rule text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS notify_agents boolean DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reminder_hours_before integer DEFAULT 24;

CREATE TABLE IF NOT EXISTS public.event_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id), notification_type text NOT NULL DEFAULT 'reminder',
  sent_at timestamptz NOT NULL DEFAULT now(), UNIQUE(event_id, agent_id, notification_type)
);
CREATE TABLE IF NOT EXISTS public.precon_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, color text DEFAULT 'blue',
  sort_order integer DEFAULT 0, is_active boolean DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.precon_project_tags (
  project_id uuid NOT NULL REFERENCES public.precon_projects(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.precon_tags(id) ON DELETE CASCADE, PRIMARY KEY (project_id, tag_id)
);
CREATE TABLE IF NOT EXISTS public.precon_property_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.precon_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, color text DEFAULT 'blue',
  sort_order integer DEFAULT 0, is_active boolean DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS notify_course_assigned boolean DEFAULT true;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS notify_course_completed boolean DEFAULT true;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS notify_reminders boolean DEFAULT true;

-- RLS for new feature tables
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precon_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precon_project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precon_property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precon_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view active properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can manage properties" ON public.properties;
CREATE POLICY "Anyone authenticated can view active properties" ON public.properties FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage properties" ON public.properties FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Agents see own notifications" ON public.in_app_notifications;
DROP POLICY IF EXISTS "Agents update own notifications" ON public.in_app_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.in_app_notifications;
CREATE POLICY "Agents see own notifications" ON public.in_app_notifications FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Agents update own notifications" ON public.in_app_notifications FOR UPDATE USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "System can insert notifications" ON public.in_app_notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins view all email notifications" ON public.email_notifications;
DROP POLICY IF EXISTS "Agents view own email notifications" ON public.email_notifications;
DROP POLICY IF EXISTS "Insert email notifications" ON public.email_notifications;
DROP POLICY IF EXISTS "Update email notifications" ON public.email_notifications;
CREATE POLICY "Admins view all email notifications" ON public.email_notifications FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Agents view own email notifications" ON public.email_notifications FOR SELECT USING (recipient_agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Insert email notifications" ON public.email_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Update email notifications" ON public.email_notifications FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Agents view own certificates" ON public.course_certificates;
DROP POLICY IF EXISTS "Admins view all certificates" ON public.course_certificates;
DROP POLICY IF EXISTS "Insert certificates" ON public.course_certificates;
CREATE POLICY "Agents view own certificates" ON public.course_certificates FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Admins view all certificates" ON public.course_certificates FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Insert certificates" ON public.course_certificates FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage own settings" ON public.admin_notification_settings;
CREATE POLICY "Admins manage own settings" ON public.admin_notification_settings FOR ALL USING (admin_user_id = auth.uid());

DROP POLICY IF EXISTS "Agents see own event notifications" ON public.event_notifications;
DROP POLICY IF EXISTS "Admins manage event notifications" ON public.event_notifications;
CREATE POLICY "Agents see own event notifications" ON public.event_notifications FOR SELECT USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage event notifications" ON public.event_notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone reads tags" ON public.precon_tags;
DROP POLICY IF EXISTS "Anyone reads project_tags" ON public.precon_project_tags;
DROP POLICY IF EXISTS "Anyone reads property_types" ON public.precon_property_types;
DROP POLICY IF EXISTS "Anyone reads statuses" ON public.precon_statuses;
DROP POLICY IF EXISTS "Admins manage tags" ON public.precon_tags;
DROP POLICY IF EXISTS "Admins manage project_tags" ON public.precon_project_tags;
DROP POLICY IF EXISTS "Admins manage property_types" ON public.precon_property_types;
DROP POLICY IF EXISTS "Admins manage statuses" ON public.precon_statuses;
CREATE POLICY "Anyone reads tags" ON public.precon_tags FOR SELECT USING (true);
CREATE POLICY "Anyone reads project_tags" ON public.precon_project_tags FOR SELECT USING (true);
CREATE POLICY "Anyone reads property_types" ON public.precon_property_types FOR SELECT USING (true);
CREATE POLICY "Anyone reads statuses" ON public.precon_statuses FOR SELECT USING (true);
CREATE POLICY "Admins manage tags" ON public.precon_tags FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage project_tags" ON public.precon_project_tags FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage property_types" ON public.precon_property_types FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage statuses" ON public.precon_statuses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- New storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('precon-images', 'precon-images', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view precon images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload precon images" ON storage.objects;
CREATE POLICY "Anyone can view property images" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');
CREATE POLICY "Admins can upload property images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view precon images" ON storage.objects FOR SELECT USING (bucket_id = 'precon-images');
CREATE POLICY "Admins can upload precon images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'precon-images' AND public.has_role(auth.uid(), 'admin'));

-- ─── SEED DATA ─────────────────────────────────────────────────
INSERT INTO public.precon_tags (name, color, sort_order) VALUES
  ('New','red',0),('Featured','amber',1),('Hot','orange',2),('Exclusive','purple',3),('VIP Access','indigo',4)
ON CONFLICT (name) DO NOTHING;
INSERT INTO public.precon_property_types (name, sort_order) VALUES
  ('Condo',0),('Townhome',1),('Home',2),('Mixed / All',3),('Commercial',4),('Stacked Townhome',5)
ON CONFLICT (name) DO NOTHING;
INSERT INTO public.precon_statuses (name, color, sort_order) VALUES
  ('Now Selling','green',0),('Coming Soon','amber',1),('Active','blue',2),('Ready','emerald',3),('Sold Out','gray',4),('Registration Open','purple',5)
ON CONFLICT (name) DO NOTHING;

-- DONE!
SELECT 'Setup complete! All tables created.' as result;
