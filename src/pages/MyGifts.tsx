import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, LogOut, ArrowLeft, Check, Clock, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";
import { format } from "date-fns";

interface GiftWithDetails {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  meal: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    restaurant: {
      id: string;
      name: string;
      address: string | null;
      phone: string | null;
    } | null;
  } | null;
  sender: {
    name: string | null;
    email: string | null;
  } | null;
}

const MyGifts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [gifts, setGifts] = useState<GiftWithDetails[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        fetchGifts(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchGifts = async (userId: string) => {
    setLoading(true);
    
    const { data: giftsData, error } = await supabase
      .from("gifts")
      .select(`
        id,
        message,
        status,
        created_at,
        redeemed_at,
        meal_id,
        sender_id
      `)
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load your gifts",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch meal and sender details
    const giftsWithDetails: GiftWithDetails[] = await Promise.all(
      (giftsData || []).map(async (gift) => {
        // Fetch meal with restaurant
        const { data: meal } = await supabase
          .from("meals")
          .select(`
            id,
            name,
            description,
            price,
            image_url,
            restaurant_id
          `)
          .eq("id", gift.meal_id)
          .maybeSingle();

        let restaurant = null;
        if (meal?.restaurant_id) {
          const { data: restaurantData } = await supabase
            .from("restaurants")
            .select("id, name, address, phone")
            .eq("id", meal.restaurant_id)
            .maybeSingle();
          restaurant = restaurantData;
        }

        // Fetch sender profile
        const { data: sender } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("id", gift.sender_id)
          .maybeSingle();

        return {
          ...gift,
          meal: meal ? { ...meal, restaurant } : null,
          sender,
        };
      })
    );

    setGifts(giftsWithDetails);
    setLoading(false);
  };

  const handleRedeem = async (giftId: string) => {
    setRedeeming(giftId);
    
    const { error } = await supabase
      .from("gifts")
      .update({
        status: "redeemed",
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", giftId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to redeem gift. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Gift Redeemed!",
        description: "Show this to the restaurant to claim your meal.",
      });
      
      setGifts(prev => prev.map(g => 
        g.id === giftId 
          ? { ...g, status: "redeemed", redeemed_at: new Date().toISOString() }
          : g
      ));
    }
    
    setRedeeming(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-amber-500/20 text-amber-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "redeemed":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-600"><Check className="w-3 h-3 mr-1" /> Redeemed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your gifts...</p>
        </div>
      </div>
    );
  }

  const pendingGifts = gifts.filter(g => g.status === "pending");
  const redeemedGifts = gifts.filter(g => g.status === "redeemed");

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Gift className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">My Gifts</h1>
            </div>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Pending Gifts */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Ready to Redeem</h2>
              <p className="text-muted-foreground">{pendingGifts.length} gift{pendingGifts.length !== 1 ? 's' : ''} waiting</p>
            </div>
          </div>

          {pendingGifts.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="py-12 text-center">
                <Gift className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No pending gifts</p>
                <p className="text-sm text-muted-foreground mt-1">When someone sends you a meal gift, it will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pendingGifts.map((gift) => (
                <Card key={gift.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {gift.meal?.image_url && (
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={gift.meal.image_url} 
                        alt={gift.meal.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{gift.meal?.name || "Meal Gift"}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Utensils className="w-3 h-3" />
                          {gift.meal?.restaurant?.name || "Restaurant"}
                        </CardDescription>
                      </div>
                      {getStatusBadge(gift.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gift.message && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm italic">"{gift.message}"</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          From: {gift.sender?.name || gift.sender?.email || "A friend"}
                        </p>
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      <p>Received: {format(new Date(gift.created_at), "MMM d, yyyy")}</p>
                      {gift.meal?.restaurant?.address && (
                        <p className="mt-1">📍 {gift.meal.restaurant.address}</p>
                      )}
                    </div>

                    <Button 
                      className="w-full bg-gradient-hero text-primary-foreground"
                      onClick={() => handleRedeem(gift.id)}
                      disabled={redeeming === gift.id}
                    >
                      {redeeming === gift.id ? "Redeeming..." : "Redeem Gift"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Redeemed Gifts */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Redeemed</h2>
              <p className="text-muted-foreground">{redeemedGifts.length} gift{redeemedGifts.length !== 1 ? 's' : ''} enjoyed</p>
            </div>
          </div>

          {redeemedGifts.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No redeemed gifts yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {redeemedGifts.map((gift) => (
                <Card key={gift.id} className="opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{gift.meal?.name || "Meal Gift"}</CardTitle>
                        <CardDescription className="text-sm">
                          {gift.meal?.restaurant?.name || "Restaurant"}
                        </CardDescription>
                      </div>
                      {getStatusBadge(gift.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Redeemed: {gift.redeemed_at && format(new Date(gift.redeemed_at), "MMM d, yyyy")}
                    </p>
                    {gift.sender && (
                      <p className="text-sm text-muted-foreground mt-1">
                        From: {gift.sender.name || gift.sender.email}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MyGifts;
