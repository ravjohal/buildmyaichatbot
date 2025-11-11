import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/forgot-password", {
        email,
      });

      if (response.ok) {
        setEmailSent(true);
        toast({
          title: "Email Sent",
          description: "If an account exists with that email, you'll receive password reset instructions shortly.",
        });
      } else {
        // For security, we show success even if email doesn't exist
        setEmailSent(true);
        toast({
          title: "Email Sent",
          description: "If an account exists with that email, you'll receive password reset instructions shortly.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Forgot Password - BuildMyChatbot.Ai"
        description="Reset your BuildMyChatbot.Ai account password."
        noindex={true}
      />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Logo size="md" />
            </div>
            <CardTitle className="text-2xl">Forgot Password</CardTitle>
            <CardDescription>
              {emailSent 
                ? "Check your email for reset instructions"
                : "Enter your email to receive a password reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-send-reset-email"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  We've sent password reset instructions to <strong>{email}</strong>. 
                  Please check your inbox and follow the link to reset your password.
                </p>
                <p className="text-xs text-muted-foreground">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => navigate("/login")}
                data-testid="link-login"
              >
                Sign in
              </button>
            </p>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
