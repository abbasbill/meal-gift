-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create meals table
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  restaurant TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on meals
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Meals policies - everyone can view meals
CREATE POLICY "Anyone can view meals"
  ON public.meals FOR SELECT
  USING (true);

-- Create gifts table
CREATE TABLE public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  meal_id UUID REFERENCES public.meals(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'paid', 'redeemed', 'cancelled')),
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  redeemed_at TIMESTAMPTZ
);

-- Enable RLS on gifts
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

-- Gifts policies
CREATE POLICY "Users can view gifts they sent"
  ON public.gifts FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can view gifts they received"
  ON public.gifts FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can insert gifts they send"
  ON public.gifts FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update gift status"
  ON public.gifts FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email
  );
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample meals
INSERT INTO public.meals (name, description, price, restaurant) VALUES
  ('Gourmet Burger & Fries', 'Juicy beef patty with melted cheese, fresh vegetables, and crispy fries', 18.99, 'The Burger House'),
  ('Mediterranean Bowl', 'Fresh vegetables, falafel, hummus, and tahini sauce over quinoa', 16.50, 'Fresh & Healthy'),
  ('Margherita Pizza', 'Classic Italian pizza with fresh mozzarella, basil, and tomato sauce', 22.00, 'Pizzeria Bella'),
  ('Grilled Salmon Plate', 'Atlantic salmon with roasted vegetables and lemon butter sauce', 28.99, 'Ocean Grill'),
  ('Chicken Pad Thai', 'Stir-fried rice noodles with chicken, peanuts, and tangy sauce', 19.50, 'Thai Kitchen'),
  ('Caesar Salad with Chicken', 'Romaine lettuce, parmesan, croutons, and grilled chicken breast', 15.99, 'Garden Bistro');