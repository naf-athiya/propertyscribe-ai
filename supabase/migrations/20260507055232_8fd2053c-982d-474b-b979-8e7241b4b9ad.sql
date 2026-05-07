
-- Generations table
CREATE TABLE public.generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  property_image_url TEXT,
  influencer_image_url TEXT,
  script TEXT,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  fal_request_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Open read + insert for everyone (no auth in app yet)
CREATE POLICY "Anyone can view generations"
  ON public.generations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create generations"
  ON public.generations FOR INSERT
  WITH CHECK (true);

-- Updates/deletes only via service role (edge functions)
-- No policies for UPDATE/DELETE = blocked for anon/authenticated

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_generations_updated_at
  BEFORE UPDATE ON public.generations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.generations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generations;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('property-images', 'property-images', true),
  ('influencer-images', 'influencer-images', true),
  ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, public insert (no auth yet)
CREATE POLICY "Public can view property images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Anyone can upload property images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Public can view influencer images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'influencer-images');

CREATE POLICY "Anyone can upload influencer images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'influencer-images');

CREATE POLICY "Public can view videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');
