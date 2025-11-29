import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Gift } from "lucide-react";

interface Meal {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  restaurant_id: string;
  restaurants: {
    name: string;
    image_url: string;
  };
}

interface Restaurant {
  id: string;
  name: string;
}

export default function BrowseMeals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");

  useEffect(() => {
    fetchMeals();
    fetchRestaurants();
  }, []);

  const fetchMeals = async () => {
    try {
      const { data, error } = await supabase
        .from("meals")
        .select(`
          *,
          restaurants (
            name,
            image_url
          )
        `)
        .eq("is_available", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMeals(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load meals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error("Failed to load restaurants", error);
    }
  };

  const filteredMeals = meals.filter((meal) => {
    const matchesSearch = meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRestaurant = selectedRestaurant === "all" || meal.restaurant_id === selectedRestaurant;
    return matchesSearch && matchesRestaurant;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Browse Meals</h1>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Restaurants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Restaurants</SelectItem>
                {restaurants.map((restaurant) => (
                  <SelectItem key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Meals Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading meals...</p>
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No meals found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeals.map((meal) => (
              <Card key={meal.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video relative overflow-hidden bg-muted">
                  {meal.image_url ? (
                    <img
                      src={meal.image_url}
                      alt={meal.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Gift className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle>{meal.name}</CardTitle>
                  <CardDescription>
                    {meal.restaurants?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {meal.description}
                  </p>
                  <p className="text-2xl font-bold mt-4">
                    ${Number(meal.price).toFixed(2)}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => navigate(`/gift/${meal.id}`)}>
                    <Gift className="mr-2 h-4 w-4" />
                    Send as Gift
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
