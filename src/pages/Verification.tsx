import { useState, useEffect } from "react";
import { Shield, ExternalLink, CheckCircle, AlertCircle, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Verification = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sheerIdLink, setSheerIdLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sheerIdLink.trim()) {
      toast({
        title: "Error",
        description: "Please enter your SheerID verification link",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    if (!sheerIdLink.includes("sheerid") && !sheerIdLink.startsWith("http")) {
      toast({
        title: "Invalid Link",
        description: "Please enter a valid SheerID verification link",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("verifications").insert({
        user_id: user!.id,
        sheerid_link: sheerIdLink.trim(),
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Verification Submitted!",
        description: "Your SheerID link has been submitted for processing.",
      });
      setSheerIdLink("");
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit verification",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-20" />
      <div className="fixed inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />

      {/* Header */}
      <header className="relative z-10">
        <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary neon-glow-text" />
            <span className="font-display text-3xl tracking-wide text-foreground">MILVERIFY</span>
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="h-4 w-4 mr-2" />
              View Dashboard
            </Button>
          </div>

          <Card className="bg-background/50 backdrop-blur-xl border-primary/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Shield className="h-16 w-16 text-primary neon-glow-text" />
              </div>
              <CardTitle className="font-display text-3xl">Military Verification</CardTitle>
              <CardDescription className="text-lg">
                Submit your SheerID verification link to complete the process
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Instructions */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  How to Get Verified
                </h3>
                <ol className="text-sm text-muted-foreground space-y-2 ml-7 list-decimal">
                  <li>Visit the SheerID verification portal</li>
                  <li>Complete the military status verification</li>
                  <li>Copy your unique verification link</li>
                  <li>Paste the link below and submit</li>
                </ol>
              </div>

              {/* SheerID Portal Link */}
              <div className="text-center">
                <a
                  href="https://www.sheerid.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open SheerID Verification Portal
                </a>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sheerid-link" className="text-foreground">
                    SheerID Verification Link
                  </Label>
                  <Input
                    id="sheerid-link"
                    type="url"
                    placeholder="https://verify.sheerid.com/..."
                    value={sheerIdLink}
                    onChange={(e) => setSheerIdLink(e.target.value)}
                    className="bg-background/50 border-primary/30 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your complete SheerID verification URL here
                  </p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 neon-glow"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submit Verification
                    </>
                  )}
                </Button>
              </form>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-yellow-500 mb-1">Important</p>
                    <p>Only submit links from official SheerID verification. Fraudulent submissions will result in account suspension.</p>
                  </div>
                </div>
              </div>

              {/* User Info */}
              {user && (
                <div className="text-center text-sm text-muted-foreground border-t border-border pt-4">
                  Logged in as: <span className="text-foreground">{user.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Verification;
