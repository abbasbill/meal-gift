import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GiftSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setStatus("error");
      toast({
        title: "Error",
        description: "Invalid payment session",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("verify-gift-payment", {
        body: { session_id: sessionId },
      });

      if (error) throw error;

      if (data.success) {
        setStatus("success");
        toast({
          title: "Gift Sent!",
          description: "Your gift has been sent successfully.",
        });
      } else {
        throw new Error("Verification failed");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      setStatus("error");
      toast({
        title: "Error",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
    }
  };

  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
            <CardTitle>Processing Your Gift</CardTitle>
            <CardDescription>
              Please wait while we verify your payment and send the gift...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Something Went Wrong</CardTitle>
            <CardDescription>
              There was an issue processing your gift. Please contact support if you were charged.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate("/meals")} className="w-full">
              Browse Meals
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Gift Sent Successfully!</CardTitle>
          <CardDescription>
            Your meal gift has been sent. The recipient will be notified and can redeem it anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <Gift className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              The recipient can view and redeem this gift from their "My Gifts" page.
            </p>
          </div>
          <Button onClick={() => navigate("/meals")} className="w-full">
            Send Another Gift
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
