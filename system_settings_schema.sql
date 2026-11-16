-- system_settings_schema.sql (corrected working version)
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the settings
CREATE POLICY "Anyone can read system_settings"
    ON public.system_settings
    FOR SELECT
    USING (true);

-- Allow only admins to update settings (auth.uid() cast to text to match users.id type)
CREATE POLICY "Admins can update system_settings"
    ON public.system_settings
    FOR UPDATE
    USING (
        auth.uid()::text IN (
            SELECT id FROM public.users 
            WHERE role #>> '{}' IN ('admin', 'super_admin')
        )
    );

-- Allow only admins to insert settings
CREATE POLICY "Admins can insert system_settings"
    ON public.system_settings
    FOR INSERT
    WITH CHECK (
        auth.uid()::text IN (
            SELECT id FROM public.users 
            WHERE role #>> '{}' IN ('admin', 'super_admin')
        )
    );

-- Insert default: Free Mode
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'hifz_mode', 
    '"free"'::jsonb, 
    'The global mode for the Hifz AI Lab. Can be "free" (Tarteel + Cloudflare AI) or "premium" (OpenAI Whisper + GPT-4o).'
) ON CONFLICT (key) DO NOTHING;
