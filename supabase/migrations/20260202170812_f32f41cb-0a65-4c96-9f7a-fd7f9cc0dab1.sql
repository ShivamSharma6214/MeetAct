-- Create enum for priorities
CREATE TYPE public.action_priority AS ENUM ('Low', 'Medium', 'High');

-- Create enum for action statuses
CREATE TYPE public.action_status AS ENUM ('Open', 'In Progress', 'Done');

-- Create profiles table (user data, preferences, team associations)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    teams TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meetings table
CREATE TABLE public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    meeting_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    transcript TEXT,
    audio_url TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create action_items table
CREATE TABLE public.action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_item TEXT NOT NULL,
    owner TEXT,
    owner_email TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    priority public.action_priority DEFAULT 'Medium',
    status public.action_status DEFAULT 'Open',
    confidence DECIMAL(3,2) DEFAULT 1.00,
    notes TEXT,
    jira_issue_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create integrations table for OAuth tokens
CREATE TABLE public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    cloud_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, service)
);

-- Create reminders_log table
CREATE TABLE public.reminders_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_item_id UUID NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics table for time saved metrics
CREATE TABLE public.analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    meetings_processed INTEGER DEFAULT 0,
    actions_created INTEGER DEFAULT 0,
    actions_completed INTEGER DEFAULT 0,
    time_saved_minutes INTEGER DEFAULT 0,
    week_start DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, week_start)
);

-- Create indexes for performance
CREATE INDEX idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX idx_meetings_date ON public.meetings(meeting_date DESC);
CREATE INDEX idx_action_items_meeting_id ON public.action_items(meeting_id);
CREATE INDEX idx_action_items_user_id ON public.action_items(user_id);
CREATE INDEX idx_action_items_status ON public.action_items(status);
CREATE INDEX idx_action_items_deadline ON public.action_items(deadline);
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX idx_analytics_user_id ON public.analytics(user_id);
CREATE INDEX idx_analytics_week ON public.analytics(week_start DESC);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for meetings
CREATE POLICY "Users can view own meetings" ON public.meetings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meetings" ON public.meetings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings" ON public.meetings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings" ON public.meetings
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for action_items
CREATE POLICY "Users can view own action items" ON public.action_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own action items" ON public.action_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action items" ON public.action_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own action items" ON public.action_items
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for integrations
CREATE POLICY "Users can view own integrations" ON public.integrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own integrations" ON public.integrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON public.integrations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON public.integrations
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reminders_log (read-only for users via their action items)
CREATE POLICY "Users can view reminders for own action items" ON public.reminders_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.action_items
            WHERE action_items.id = reminders_log.action_item_id
            AND action_items.user_id = auth.uid()
        )
    );

-- RLS Policies for analytics
CREATE POLICY "Users can view own analytics" ON public.analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON public.analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics" ON public.analytics
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_action_items_updated_at
    BEFORE UPDATE ON public.action_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON public.integrations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at
    BEFORE UPDATE ON public.analytics
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for action_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_items;

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('meeting-audio', 'meeting-audio', false, 104857600);

-- Storage policies for audio files
CREATE POLICY "Users can upload own audio files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'meeting-audio' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own audio files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'meeting-audio' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own audio files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'meeting-audio' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);