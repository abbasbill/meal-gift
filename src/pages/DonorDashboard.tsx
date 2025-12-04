import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Clock, Heart, CheckCircle, Package } from "lucide-react";

interface MealRequest {
  id: string;
  recipient_id: string;
  meal_description: string;
  delivery_address: string;
  status: string;
  created_at: string;
  notes: string | null;
  recipient?: { name: string | null };
}

const DonorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<MealRequest[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<MealRequest[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      await fetchRequests(session.user.id);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to real-time updates
    const channel = supabase
      .channel('meal-requests-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meal_requests' },
        () => {
          fetchRequests(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchRequests = async (uid: string) => {
    setLoading(true);
    try {
      // Fetch pending requests
      const { data: pending, error: pendingError } = await supabase
        .from("meal_requests")
        .select(`*, recipient:profiles!meal_requests_recipient_id_fkey(name)`)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (pendingError) throw pendingError;

      // Fetch my active deliveries
      const { data: active, error: activeError } = await supabase
        .from("meal_requests")
        .select(`*, recipient:profiles!meal_requests_recipient_id_fkey(name)`)
        .eq("donor_id", uid)
        .in("status", ["matched", "preparing", "on_the_way"])
        .order("matched_at", { ascending: false });

      if (activeError) throw activeError;

      setPendingRequests(pending || []);
      setMyDeliveries(active || []);
    } catch (error: any) {
      toast({
        title: "Error fetching requests",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("meal_requests")
        .update({
          donor_id: userId,
          status: "matched",
          matched_at: new Date().toISOString()
        })
        .eq("id", requestId)
        .eq("status", "pending");

      if (error) throw error;

      toast({
        title: "Request accepted!",
        description: "You can now prepare and deliver the meal.",
      });

      navigate(`/delivery-status/${requestId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <nav className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Donor Dashboard</h1>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* My Active Deliveries */}
        {myDeliveries.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              My Active Deliveries
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {myDeliveries.map((delivery) => (
                <Card 
                  key={delivery.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow border-primary/30"
                  onClick={() => navigate(`/delivery-status/${delivery.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="secondary" className="bg-primary/20 text-primary">
                        {delivery.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="font-medium mb-2">{delivery.meal_description}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {delivery.delivery_address}
                    </p>
                    <Button className="w-full mt-4" size="sm">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Pending Requests */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            Meal Requests Nearby
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading requests...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No pending requests</p>
                <p className="text-muted-foreground">Check back soon for new meal requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base line-clamp-2">
                        {request.meal_description}
                      </CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getTimeAgo(request.created_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{request.delivery_address}</span>
                    </div>
                    {request.notes && (
                      <p className="text-sm bg-secondary/50 p-2 rounded text-muted-foreground">
                        {request.notes}
                      </p>
                    )}
                    <Button 
                      className="w-full" 
                      onClick={() => acceptRequest(request.id)}
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      Accept & Deliver
                    </Button>
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

export default DonorDashboard;
