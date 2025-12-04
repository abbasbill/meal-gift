import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Clock, CheckCircle2, Package, Truck, 
  MapPin, Phone, MessageSquare, User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryDetails {
  id: string;
  recipient_id: string;
  donor_id: string | null;
  meal_description: string;
  delivery_address: string;
  recipient_phone: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  matched_at: string | null;
  preparing_at: string | null;
  on_the_way_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  recipient?: { name: string | null; email: string | null };
  donor?: { name: string | null; email: string | null };
}

const STATUS_STEPS = [
  { key: "pending", label: "Request Submitted", icon: Clock },
  { key: "matched", label: "Donor Matched", icon: User },
  { key: "preparing", label: "Preparing Meal", icon: Package },
  { key: "on_the_way", label: "On the Way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

const DeliveryStatus = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDonor, setIsDonor] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      await fetchDelivery(session.user.id);
    };
    init();
  }, [requestId, navigate]);

  useEffect(() => {
    if (!requestId) return;

    // Subscribe to real-time updates for this specific request
    const channel = supabase
      .channel(`delivery-${requestId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'meal_requests',
          filter: `id=eq.${requestId}`
        },
        (payload) => {
          console.log("Real-time update received:", payload);
          setDelivery(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  const fetchDelivery = async (uid: string) => {
    if (!requestId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("meal_requests")
        .select(`
          *,
          recipient:profiles!meal_requests_recipient_id_fkey(name, email),
          donor:profiles!meal_requests_donor_id_fkey(name, email)
        `)
        .eq("id", requestId)
        .single();

      if (error) throw error;

      setDelivery(data);
      setIsDonor(data.donor_id === uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!requestId || !delivery) return;

    const timestampField = `${newStatus}_at`;
    
    try {
      const { error } = await supabase
        .from("meal_requests")
        .update({
          status: newStatus,
          [timestampField]: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Delivery status changed to "${newStatus.replace("_", " ")}"`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const confirmDelivery = async () => {
    if (!requestId) return;

    try {
      const { error } = await supabase
        .from("meal_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Delivery completed!",
        description: "Thank you for your generosity!",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getCurrentStepIndex = () => {
    if (!delivery) return 0;
    return STATUS_STEPS.findIndex(s => s.key === delivery.status);
  };

  const getNextStatus = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < STATUS_STEPS.length - 1) {
      return STATUS_STEPS[currentIndex + 1].key;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading delivery status...</p>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-lg">Delivery not found</p>
            <Button className="mt-4" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const isRecipient = delivery.recipient_id === userId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <nav className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Delivery Status</h1>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Status Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {delivery.status === "completed" 
                ? "Delivery Completed!" 
                : delivery.status === "pending"
                ? "Finding a Donor..."
                : STATUS_STEPS[currentStepIndex]?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
              
              {/* Steps */}
              <div className="space-y-6">
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index < currentStepIndex || delivery.status === "completed";
                  const isCurrent = index === currentStepIndex && delivery.status !== "completed";
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="flex items-center gap-4 relative">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center z-10 transition-colors",
                        isCompleted && "bg-primary text-primary-foreground",
                        isCurrent && "bg-primary/20 text-primary border-2 border-primary animate-pulse",
                        !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={cn(
                          "font-medium",
                          (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {step.label}
                        </p>
                        {isCompleted && delivery[`${step.key}_at` as keyof DeliveryDetails] && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(delivery[`${step.key}_at` as keyof DeliveryDetails] as string).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meal Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{delivery.meal_description}</p>
            </div>
            
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Delivery Address</p>
                <p className="font-medium">{delivery.delivery_address}</p>
              </div>
            </div>

            {delivery.recipient_phone && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{delivery.recipient_phone}</p>
                </div>
              </div>
            )}

            {delivery.notes && (
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{delivery.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        {delivery.donor && !isRecipient && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recipient</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{delivery.recipient?.name || "Anonymous"}</p>
            </CardContent>
          </Card>
        )}

        {delivery.donor && isRecipient && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Donor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{delivery.donor?.name || "A kind donor"}</p>
            </CardContent>
          </Card>
        )}

        {/* Donor Actions */}
        {isDonor && delivery.status !== "completed" && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {delivery.status === "matched" && (
                <Button className="w-full" onClick={() => updateStatus("preparing")}>
                  <Package className="mr-2 h-4 w-4" />
                  Start Preparing
                </Button>
              )}
              {delivery.status === "preparing" && (
                <Button className="w-full" onClick={() => updateStatus("on_the_way")}>
                  <Truck className="mr-2 h-4 w-4" />
                  On My Way
                </Button>
              )}
              {delivery.status === "on_the_way" && (
                <Button className="w-full" onClick={() => updateStatus("delivered")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Delivered
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recipient Confirmation */}
        {isRecipient && delivery.status === "delivered" && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg">Confirm Receipt</CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={confirmDelivery}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                I Received My Meal
              </Button>
            </CardContent>
          </Card>
        )}

        {delivery.status === "completed" && (
          <Card className="bg-primary/5 border-primary/30">
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
              <p className="text-xl font-semibold">Delivery Complete!</p>
              <p className="text-muted-foreground">Thank you for making a difference</p>
              <Button className="mt-4" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DeliveryStatus;
