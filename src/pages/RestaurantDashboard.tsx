import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, Menu, Gift, AlertCircle } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  image_url: string;
}

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [mealCount, setMealCount] = useState(0);

  useEffect(() => {
    checkRestaurant();
  }, []);

  const checkRestaurant = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has restaurant_owner role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "restaurant_owner");

      if (!roles || roles.length === 0) {
        navigate("/restaurant/register");
        return;
      }

      // Get restaurant
      const { data: restaurantData, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          navigate("/restaurant/register");
          return;
        }
        throw error;
      }

      setRestaurant(restaurantData);

      // Get meal count
      const { count } = await supabase
        .from("meals")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantData.id);

      setMealCount(count || 0);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load restaurant dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{restaurant.name}</h1>
                <Badge variant={restaurant.is_active ? "default" : "secondary"}>
                  {restaurant.is_active ? "Active" : "Pending Approval"}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              User Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!restaurant.is_active && (
          <Card className="mb-6 border-warning">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                <CardTitle>Pending Approval</CardTitle>
              </div>
              <CardDescription>
                Your restaurant is currently under review. You can start adding menu items,
                but they won't be visible to customers until your restaurant is approved.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mealCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total dishes on your menu
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {restaurant.is_active ? "✓" : "⏳"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {restaurant.is_active ? "Restaurant is live" : "Awaiting approval"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Gifts Received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                Meals gifted from your restaurant
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/restaurant/menu")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Menu className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Manage Menu</CardTitle>
                  <CardDescription>Add, edit, or remove menu items</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow opacity-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>View Orders</CardTitle>
                  <CardDescription>Coming soon</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}
