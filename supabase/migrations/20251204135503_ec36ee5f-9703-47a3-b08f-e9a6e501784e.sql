-- Create meal_requests table for P2P delivery flow
CREATE TABLE public.meal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id),
  donor_id UUID REFERENCES public.profiles(id),
  meal_description TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  recipient_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  matched_at TIMESTAMP WITH TIME ZONE,
  preparing_at TIMESTAMP WITH TIME ZONE,
  on_the_way_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.meal_requests ENABLE ROW LEVEL SECURITY;

-- Recipients can view and create their own requests
CREATE POLICY "Recipients can view their own requests"
ON public.meal_requests FOR SELECT
USING (auth.uid() = recipient_id);

CREATE POLICY "Recipients can create requests"
ON public.meal_requests FOR INSERT
WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Recipients can update their own requests"
ON public.meal_requests FOR UPDATE
USING (auth.uid() = recipient_id);

-- Donors can view pending requests
CREATE POLICY "Donors can view pending requests"
ON public.meal_requests FOR SELECT
USING (status = 'pending' OR donor_id = auth.uid());

-- Donors can update requests they're assigned to
CREATE POLICY "Donors can update their assigned requests"
ON public.meal_requests FOR UPDATE
USING (donor_id = auth.uid());

-- Enable realtime for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_requests;
ALTER TABLE public.meal_requests REPLICA IDENTITY FULL;