import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, Phone, MapPin, ChefHat, Gift, Check, X } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  is_active: boolean;
  image_url: string;
  created_at: string;
  owner_id: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

interface Meal {
  id: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  image_url: string;
  created_at: string;
}

export default function RestaurantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [stats, setStats] = useState({ totalMeals: 0, activeMeals: 0, giftsReceived: 0 });

  useEffect(() => {
    checkAdminAccess();
  }, [id]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this page",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      await loadRestaurantData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to verify admin access",
        variant: "destructive",
      });
    }
  };

  const loadRestaurantData = async () => {
    try {
      // Load restaurant
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", id)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      // Load owner profile
      const { data: ownerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", restaurantData.owner_id)
        .single();

      setOwner(ownerData);

      // Load meals
      const { data: mealsData } = await supabase
        .from("meals")
        .select("*")
        .eq("restaurant_id", id)
        .order("created_at", { ascending: false });

      setMeals(mealsData || []);

      // Calculate stats
      const totalMeals = mealsData?.length || 0;
      const activeMeals = mealsData?.filter(m => m.is_available).length || 0;

      // Get gifts received count
      const mealIds = mealsData?.map(m => m.id) || [];
      let giftsCount = 0;
      
      if (mealIds.length > 0) {
        const { count } = await supabase
          .from("gifts")
          .select("*", { count: "exact", head: true })
          .in("meal_id", mealIds);
        giftsCount = count || 0;
      }

      setStats({
        totalMeals,
        activeMeals,
        giftsReceived: giftsCount || 0,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load restaurant data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!restaurant) return;

    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ is_active: !restaurant.is_active })
        .eq("id", restaurant.id);

      if (error) throw error;

      setRestaurant({ ...restaurant, is_active: !restaurant.is_active });

      toast({
        title: "Success",
        description: `Restaurant ${!restaurant.is_active ? "activated" : "deactivated"} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update restaurant status",
        variant: "destructive",
      });
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Restaurant not found</p>
          <Button onClick={() => navigate("/admin")}>Back to Admin Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Dashboard
            </Button>
            <Button
              variant={restaurant.is_active ? "outline" : "default"}
              onClick={handleToggleStatus}
            >
              {restaurant.is_active ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Deactivate Restaurant
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Activate Restaurant
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Restaurant Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
              <Badge variant={restaurant.is_active ? "default" : "secondary"}>
                {restaurant.is_active ? "Active" : "Pending Approval"}
              </Badge>
            </div>
          </div>
          {restaurant.description && (
            <p className="text-muted-foreground">{restaurant.description}</p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Menu Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalMeals}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeMeals} currently available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Gifts Received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.giftsReceived}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total meals gifted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Registered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {new Date(restaurant.created_at).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Member since
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Restaurant Information */}
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>Contact details and location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {restaurant.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                  </div>
                </div>
              )}
              {restaurant.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{restaurant.phone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Owner Information */}
          <Card>
            <CardHeader>
              <CardTitle>Owner Information</CardTitle>
              <CardDescription>Restaurant owner contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {owner?.name && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">{owner.name}</p>
                  </div>
                </div>
              )}
              {owner?.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{owner.email}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Menu Items */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Items</CardTitle>
            <CardDescription>All dishes from this restaurant</CardDescription>
          </CardHeader>
          <CardContent>
            {meals.length === 0 ? (
              <div className="text-center py-8">
                <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No menu items added yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meals.map((meal) => (
                    <TableRow key={meal.id}>
                      <TableCell className="font-medium">{meal.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {meal.description || "N/A"}
                      </TableCell>
                      <TableCell>${meal.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={meal.is_available ? "default" : "secondary"}>
                          {meal.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(meal.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
