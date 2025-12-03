import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-GIFT-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { meal_id, recipient_email, message } = await req.json();
    
    if (!meal_id || !recipient_email) {
      throw new Error("Meal ID and recipient email are required");
    }
    logStep("Gift data received", { meal_id, recipient_email });

    // Fetch meal details
    const { data: meal, error: mealError } = await supabaseClient
      .from("meals")
      .select("id, name, price, restaurant_id, restaurants(name)")
      .eq("id", meal_id)
      .single();

    if (mealError || !meal) {
      throw new Error("Meal not found");
    }
    logStep("Meal found", { mealName: meal.name, price: meal.price });

    // Find recipient by email
    const { data: recipientProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("email", recipient_email)
      .single();

    if (profileError || !recipientProfile) {
      throw new Error("Recipient not found. They must have an account to receive gifts.");
    }
    logStep("Recipient found", { recipientId: recipientProfile.id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const priceInCents = Math.round(Number(meal.price) * 100);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Gift: ${meal.name}`,
              description: `Meal gift from ${(meal as any).restaurants?.name || "Restaurant"}`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/gift/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/gift/${meal_id}`,
      metadata: {
        sender_id: user.id,
        recipient_id: recipientProfile.id,
        meal_id: meal_id,
        message: message || "",
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
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
