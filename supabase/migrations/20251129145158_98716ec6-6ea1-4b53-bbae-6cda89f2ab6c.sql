-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'restaurant_owner', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create restaurants table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurants
CREATE POLICY "Anyone can view active restaurants"
ON public.restaurants
FOR SELECT
USING (is_active = true OR auth.uid() = owner_id);

CREATE POLICY "Restaurant owners can insert their restaurants"
ON public.restaurants
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Restaurant owners can update their restaurants"
ON public.restaurants
FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Admins can update all restaurants"
ON public.restaurants
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at on restaurants
CREATE TRIGGER update_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Modify meals table: add restaurant_id and is_available
ALTER TABLE public.meals
ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
ADD COLUMN is_available BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Update existing meals to be available by default (already done by default value)
-- We'll need to manually assign restaurant_id for existing meals later

-- Drop old RLS policies on meals
DROP POLICY IF EXISTS "Anyone can view meals" ON public.meals;

-- Create new RLS policies for meals
CREATE POLICY "Anyone can view available meals from active restaurants"
ON public.meals
FOR SELECT
USING (
  is_available = true 
  AND EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = meals.restaurant_id 
    AND restaurants.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = meals.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can insert meals for their restaurants"
ON public.meals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = meals.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can update their meals"
ON public.meals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = meals.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can delete their meals"
ON public.meals
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = meals.restaurant_id 
    AND restaurants.owner_id = auth.uid()
  )
);

-- Add trigger for updated_at on meals
CREATE TRIGGER update_meals_updated_at
BEFORE UPDATE ON public.meals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('restaurant-images', 'restaurant-images', true),
  ('meal-images', 'meal-images', true);

-- RLS policies for restaurant-images bucket
CREATE POLICY "Anyone can view restaurant images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'restaurant-images');

CREATE POLICY "Restaurant owners can upload their restaurant images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'restaurant-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Restaurant owners can update their restaurant images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'restaurant-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Restaurant owners can delete their restaurant images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'restaurant-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for meal-images bucket
CREATE POLICY "Anyone can view meal images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'meal-images');

CREATE POLICY "Restaurant owners can upload meal images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'meal-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Restaurant owners can update meal images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'meal-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Restaurant owners can delete meal images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'meal-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);