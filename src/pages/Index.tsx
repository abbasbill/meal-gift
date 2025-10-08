import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gift, Heart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-meal.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">MealGift</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-gradient-hero text-primary-foreground shadow-warm hover:opacity-90 transition-opacity">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-5xl lg:text-6xl font-bold leading-tight">
                Spread Joy,
                <br />
                <span className="text-primary">One Meal at a Time</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Gift someone special a delicious meal. Because sharing food is sharing love.
              </p>
              <div className="flex gap-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-gradient-hero text-primary-foreground shadow-warm hover:opacity-90 transition-opacity">
                    <Gift className="mr-2 h-5 w-5" />
                    Gift a Meal Now
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-3xl" />
              <img
                src={heroImage}
                alt="Delicious meal"
                className="relative rounded-3xl shadow-warm w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-4">How It Works</h3>
            <p className="text-muted-foreground text-lg">Simple, quick, and meaningful</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-gradient-card border-none shadow-soft hover:shadow-warm transition-shadow">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h4 className="text-xl font-bold mb-3">Choose a Recipient</h4>
              <p className="text-muted-foreground">
                Select a friend, family member, or colleague who deserves a treat
              </p>
            </Card>
            <Card className="p-8 bg-gradient-card border-none shadow-soft hover:shadow-warm transition-shadow">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Gift className="w-7 h-7 text-primary" />
              </div>
              <h4 className="text-xl font-bold mb-3">Pick a Meal</h4>
              <p className="text-muted-foreground">
                Browse our curated selection of delicious meals from top restaurants
              </p>
            </Card>
            <Card className="p-8 bg-gradient-card border-none shadow-soft hover:shadow-warm transition-shadow">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-7 h-7 text-primary" />
              </div>
              <h4 className="text-xl font-bold mb-3">Spread Joy</h4>
              <p className="text-muted-foreground">
                They receive a notification and can enjoy their meal whenever they want
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="p-12 bg-gradient-hero border-none text-center shadow-warm">
            <h3 className="text-4xl font-bold mb-4 text-primary-foreground">
              Ready to Make Someone's Day?
            </h3>
            <p className="text-xl mb-8 text-primary-foreground/90">
              Start gifting meals and spreading happiness today
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="shadow-soft">
                Get Started Free
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 MealGift. Spreading joy, one meal at a time.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
