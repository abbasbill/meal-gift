import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Gift, ArrowLeft, Loader2 } from "lucide-react";

interface Meal {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  restaurants: {
    name: string;
  };
}

export default function GiftMeal() {
  const { mealId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    recipientEmail: "",
    message: "",
  });

  useEffect(() => {
    checkAuth();
    fetchMeal();
  }, [mealId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const fetchMeal = async () => {
    if (!mealId) return;
    
    try {
      const { data, error } = await supabase
        .from("meals")
        .select(`
          *,
          restaurants (name)
        `)
        .eq("id", mealId)
        .single();

      if (error) throw error;
      setMeal(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load meal",
        variant: "destructive",
      });
      navigate("/meals");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !meal) return;

    if (formData.recipientEmail === user.email) {
      toast({
        title: "Error",
        description: "You cannot send a gift to yourself",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-gift-checkout", {
        body: {
          meal_id: meal.id,
          recipient_email: formData.recipientEmail,
          message: formData.message,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process gift",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!meal) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => navigate("/meals")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meals
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Gift className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Send a Meal Gift</CardTitle>
              <CardDescription>
                Gift this delicious meal to someone special
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Meal Preview */}
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex gap-4">
                  {meal.image_url && (
                    <img
                      src={meal.image_url}
                      alt={meal.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{meal.name}</h3>
                    <p className="text-sm text-muted-foreground">{meal.restaurants?.name}</p>
                    <p className="text-xl font-bold mt-2">${Number(meal.price).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Recipient's Email *</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                    required
                    placeholder="friend@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    The recipient must have an account to receive this gift
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Personal Message (optional)</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Write a personal message to accompany your gift..."
                    rows={3}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total</span>
                    <span className="text-2xl font-bold">${Number(meal.price).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/meals")}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Gift className="mr-2 h-4 w-4" />
                        Pay & Send Gift
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
