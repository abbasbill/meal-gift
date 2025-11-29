import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Upload } from "lucide-react";

interface Meal {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
}

export default function RestaurantMenu() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    is_available: true,
  });

  useEffect(() => {
    checkRestaurantAndLoadMeals();
  }, []);

  const checkRestaurantAndLoadMeals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: restaurant, error } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (error) throw error;
      
      setRestaurantId(restaurant.id);
      await loadMeals(restaurant.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load restaurant",
        variant: "destructive",
      });
      navigate("/restaurant/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadMeals = async (restId: string) => {
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("restaurant_id", restId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load meals",
        variant: "destructive",
      });
      return;
    }

    setMeals(data || []);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('meal-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('meal-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let imageUrl = editingMeal?.image_url || null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, user.id);
      }

      const mealData = {
        restaurant_id: restaurantId,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: imageUrl,
        is_available: formData.is_available,
      };

      if (editingMeal) {
        const { error } = await supabase
          .from("meals")
          .update(mealData)
          .eq("id", editingMeal.id);

        if (error) throw error;
        toast({ title: "Success", description: "Meal updated successfully" });
      } else {
        const { error } = await supabase
          .from("meals")
          .insert(mealData);

        if (error) throw error;
        toast({ title: "Success", description: "Meal added successfully" });
      }

      await loadMeals(restaurantId);
      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save meal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mealId: string) => {
    if (!confirm("Are you sure you want to delete this meal?")) return;

    try {
      const { error } = await supabase
        .from("meals")
        .delete()
        .eq("id", mealId);

      if (error) throw error;
      
      toast({ title: "Success", description: "Meal deleted successfully" });
      await loadMeals(restaurantId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete meal",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setFormData({
      name: meal.name,
      description: meal.description || "",
      price: meal.price.toString(),
      is_available: meal.is_available,
    });
    setImagePreview(meal.image_url || "");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMeal(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      is_available: true,
    });
    setImageFile(null);
    setImagePreview("");
  };

  const toggleAvailability = async (meal: Meal) => {
    try {
      const { error } = await supabase
        .from("meals")
        .update({ is_available: !meal.is_available })
        .eq("id", meal.id);

      if (error) throw error;
      await loadMeals(restaurantId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Menu Management</h1>
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingMeal(null)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Meal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingMeal ? "Edit Meal" : "Add New Meal"}</DialogTitle>
                    <DialogDescription>
                      {editingMeal ? "Update your meal details" : "Add a new meal to your menu"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Meal Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image">Meal Image</Label>
                      {imagePreview && (
                        <div className="w-full h-48 rounded-lg overflow-hidden border mb-2">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('image')?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {imagePreview ? "Change Image" : "Upload Image"}
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="available"
                        checked={formData.is_available}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                      />
                      <Label htmlFor="available">Available for ordering</Label>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleCloseDialog}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : editingMeal ? "Update" : "Add Meal"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" onClick={() => navigate("/restaurant/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {meals.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">No meals yet. Add your first meal to get started!</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Meal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meals.map((meal) => (
              <Card key={meal.id} className={!meal.is_available ? "opacity-60" : ""}>
                <div className="aspect-video relative overflow-hidden bg-muted">
                  {meal.image_url ? (
                    <img src={meal.image_url} alt={meal.name} className="object-cover w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle>{meal.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{meal.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">${Number(meal.price).toFixed(2)}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={meal.is_available}
                      onCheckedChange={() => toggleAvailability(meal)}
                    />
                    <span className="text-sm">{meal.is_available ? "Available" : "Unavailable"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(meal)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(meal.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
