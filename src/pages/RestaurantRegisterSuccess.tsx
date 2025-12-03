import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RestaurantRegisterSuccess() {
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
      const { data, error } = await supabase.functions.invoke("verify-registration-payment", {
        body: { session_id: sessionId },
      });

      if (error) throw error;

      if (data.success) {
        setStatus("success");
        toast({
          title: "Success!",
          description: "Your restaurant has been registered successfully.",
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
            <CardTitle>Verifying Payment</CardTitle>
            <CardDescription>
              Please wait while we verify your payment and register your restaurant...
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
            <CardTitle className="text-destructive">Registration Failed</CardTitle>
            <CardDescription>
              There was an issue processing your registration. Please try again or contact support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/restaurant/register")}>
              Try Again
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
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <CardTitle>Registration Complete!</CardTitle>
          <CardDescription>
            Your restaurant has been registered and is pending admin approval.
            You'll be notified once approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => navigate("/restaurant/dashboard")} className="w-full">
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
