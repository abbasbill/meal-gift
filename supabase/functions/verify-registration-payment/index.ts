import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-REGISTRATION-PAYMENT] ${step}${detailsStr}`);
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
    
    // Create anon client to verify user
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

    // Verify the user matches
    if (session.metadata?.user_id !== user.id) {
      throw new Error("User mismatch");
    }

    // Create restaurant from metadata using service role
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from("restaurants")
      .insert({
        owner_id: user.id,
        name: session.metadata?.restaurant_name || "Unnamed Restaurant",
        description: session.metadata?.restaurant_description || null,
        address: session.metadata?.restaurant_address || null,
        phone: session.metadata?.restaurant_phone || null,
        image_url: session.metadata?.restaurant_image_url || null,
        is_active: false,
      })
      .select()
      .single();

    if (restaurantError) {
      logStep("Restaurant creation error", { error: restaurantError });
      throw restaurantError;
    }
    logStep("Restaurant created", { restaurantId: restaurant.id });

    // Assign restaurant_owner role using service role
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: "restaurant_owner",
      });

    if (roleError && !roleError.message?.includes("duplicate")) {
      logStep("Role assignment warning", { error: roleError });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      restaurant_id: restaurant.id 
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
