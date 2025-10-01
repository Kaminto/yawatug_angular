-- Create media management tables
CREATE TABLE public.media_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'general',
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social media integration table
CREATE TABLE public.social_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin', 'instagram')),
  platform_user_id TEXT NOT NULL,
  access_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Create chatbot knowledge base
CREATE TABLE public.chatbot_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app sync table for web-app integration
CREATE TABLE public.app_sync_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data_type TEXT NOT NULL,
  data_content JSONB NOT NULL,
  last_synced TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, data_type)
);

-- Enable RLS
ALTER TABLE public.media_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sync_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_gallery (public read, admin write)
CREATE POLICY "Anyone can view media gallery" 
ON public.media_gallery 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage media gallery" 
ON public.media_gallery 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- RLS Policies for social_connections
CREATE POLICY "Users can view their own social connections" 
ON public.social_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own social connections" 
ON public.social_connections 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for chatbot_knowledge (public read, admin write)
CREATE POLICY "Anyone can view chatbot knowledge" 
ON public.chatbot_knowledge 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage chatbot knowledge" 
ON public.chatbot_knowledge 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- RLS Policies for app_sync_data
CREATE POLICY "Users can view their own sync data" 
ON public.app_sync_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sync data" 
ON public.app_sync_data 
FOR ALL 
USING (auth.uid() = user_id);

-- Create storage bucket for media
INSERT INTO storage.buckets (id, name, public) VALUES ('media-gallery', 'media-gallery', true);

-- Storage policies for media uploads
CREATE POLICY "Anyone can view media files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'media-gallery');

CREATE POLICY "Admins can upload media files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'media-gallery' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

CREATE POLICY "Admins can update media files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'media-gallery' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

CREATE POLICY "Admins can delete media files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'media-gallery' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- Insert initial chatbot knowledge
INSERT INTO public.chatbot_knowledge (category, question, answer, keywords) VALUES
('navigation', 'How do I invest in shares?', 'To invest in shares, go to the Investments section, browse available shares, and click "Invest Now". You can choose your investment amount and payment method.', ARRAY['invest', 'shares', 'investment', 'buy']),
('navigation', 'How do I check my portfolio?', 'Your portfolio is available in the Dashboard section. You can view your current investments, returns, and transaction history there.', ARRAY['portfolio', 'dashboard', 'investments']),
('navigation', 'How do I download the mobile app?', 'You can download our mobile app from the App Download section or click the "Download App" button in the main navigation.', ARRAY['app', 'download', 'mobile']),
('company', 'What is Yawatu Minerals?', 'Yawatu Minerals & Mining Ltd is a women-led gold mining company offering ethical mining investments with guaranteed returns and transparent operations.', ARRAY['company', 'about', 'yawatu']),
('support', 'How do I contact support?', 'You can contact our support team through the Contact section or use this chatbot for immediate assistance with common questions.', ARRAY['support', 'contact', 'help']);

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_gallery_updated_at
  BEFORE UPDATE ON public.media_gallery
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_knowledge_updated_at
  BEFORE UPDATE ON public.chatbot_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_sync_data_updated_at
  BEFORE UPDATE ON public.app_sync_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();