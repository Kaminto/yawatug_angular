-- Fix importer failure: ensure profiles.id auto-generates UUIDs when triggers insert without explicit id
-- Safe to run repeatedly
ALTER TABLE public.profiles
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Optional: ensure column remains NOT NULL and primary key (no-op if already set)
ALTER TABLE public.profiles
ALTER COLUMN id SET NOT NULL;