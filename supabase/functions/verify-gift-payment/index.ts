import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-GIFT-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const { data } = await anonClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id });

    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("Session ID is required");
    }
    logStep("Session ID received", { session_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Session retrieved", { status: session.payment_status });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Verify the sender matches
    if (session.metadata?.sender_id !== user.id) {
      throw new Error("User mismatch");
    }

    // Check if gift already exists for this payment
    const { data: existingGift } = await supabaseClient
      .from("gifts")
      .select("id")
      .eq("payment_intent_id", session.payment_intent as string)
      .single();

    if (existingGift) {
      logStep("Gift already exists", { giftId: existingGift.id });
      return new Response(JSON.stringify({ 
        success: true, 
        gift_id: existingGift.id,
        already_created: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create gift record using service role
    const { data: gift, error: giftError } = await supabaseClient
      .from("gifts")
      .insert({
        sender_id: session.metadata?.sender_id,
        recipient_id: session.metadata?.recipient_id,
        meal_id: session.metadata?.meal_id,
        message: session.metadata?.message || null,
        payment_intent_id: session.payment_intent as string,
        status: "pending",
      })
      .select()
      .single();

    if (giftError) {
      logStep("Gift creation error", { error: giftError });
      throw giftError;
    }
    logStep("Gift created", { giftId: gift.id });

    return new Response(JSON.stringify({ 
      success: true, 
      gift_id: gift.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
