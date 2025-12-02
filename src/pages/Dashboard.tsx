import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, LogOut, ChefHat, Shield, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRestaurantOwner, setIsRestaurantOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [navigate]);

  const checkAuth = async () => {
    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    
    if (!session) {
      navigate("/auth");
      setLoading(false);
      return;
    }

    // Check user roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (roles && roles.length > 0) {
      const userRoles = roles.map(r => r.role);
      setIsRestaurantOwner(userRoles.includes("restaurant_owner"));
      setIsAdmin(userRoles.includes("admin"));
    }

    setLoading(false);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">MealGift</h1>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {session?.user?.user_metadata?.name || "Friend"}!
          </h2>
          <p className="text-muted-foreground">Ready to spread some joy today?</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/meals")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Browse Meals</CardTitle>
                  <CardDescription>Find the perfect meal to gift</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/my-gifts")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Inbox className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>My Gifts</CardTitle>
                  <CardDescription>View & redeem received gifts</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {isRestaurantOwner && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/restaurant/dashboard")}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <ChefHat className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Restaurant Dashboard</CardTitle>
                    <CardDescription>Manage your restaurant</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {!isRestaurantOwner && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/restaurant/register")}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <ChefHat className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Register Restaurant</CardTitle>
                    <CardDescription>Join our platform</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {isAdmin && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-primary/50" onClick={() => navigate("/admin")}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Admin Dashboard</CardTitle>
                    <CardDescription>Manage platform</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Your Activity</CardTitle>
              <CardDescription>Gifts sent and received</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No activity yet</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Gifts</h2>
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">You haven't sent or received any gifts yet.</p>
              <Button className="mt-4" onClick={() => navigate("/meals")}>Send Your First Gift</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
