import { useState, useEffect } from "react";
import { Shield, Clock, CheckCircle, XCircle, AlertCircle, Plus, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Verification {
  id: string;
  sheerid_link: string;
  status: "pending" | "verified" | "rejected";
  submitted_at: string;
  verified_at: string | null;
  notes: string | null;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchVerifications();
    }
  }, [user]);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("verifications")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setVerifications(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load verification history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case "verified":
        return `${baseClasses} bg-green-500/20 text-green-500 border border-green-500/30`;
      case "rejected":
        return `${baseClasses} bg-red-500/20 text-red-500 border border-red-500/30`;
      default:
        return `${baseClasses} bg-yellow-500/20 text-yellow-500 border border-yellow-500/30`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get latest verification status for summary
  const latestVerification = verifications[0];
  const isVerified = latestVerification?.status === "verified";
  const hasPending = verifications.some((v) => v.status === "pending");

  if (authLoading) {
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
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>

          {/* Status Summary Card */}
          <Card className="bg-background/50 backdrop-blur-xl border-primary/20 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-2xl">Verification Status</CardTitle>
                  <CardDescription>Your current verification status</CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={fetchVerifications}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {isVerified ? (
                  <>
                    <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-green-500">Verified</p>
                      <p className="text-muted-foreground">Your military status has been verified</p>
                    </div>
                  </>
                ) : hasPending ? (
                  <>
                    <div className="h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-yellow-500">Pending Review</p>
                      <p className="text-muted-foreground">Your verification is being processed</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-muted-foreground">Not Verified</p>
                      <p className="text-muted-foreground">Submit your SheerID verification to get started</p>
                    </div>
                  </>
                )}
              </div>

              {!isVerified && (
                <Button
                  onClick={() => navigate("/verification")}
                  className="mt-6 bg-primary hover:bg-primary/90 neon-glow"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Verification
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Verification History */}
          <Card className="bg-background/50 backdrop-blur-xl border-primary/20">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Verification History</CardTitle>
              <CardDescription>All your verification submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : verifications.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No verification history yet</p>
                  <Button onClick={() => navigate("/verification")} className="bg-primary hover:bg-primary/90">
                    Start Verification
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {verifications.map((verification) => (
                    <div
                      key={verification.id}
                      className="p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {getStatusIcon(verification.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground truncate">
                              {verification.sheerid_link}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Submitted: {formatDate(verification.submitted_at)}
                            </p>
                            {verification.verified_at && (
                              <p className="text-xs text-muted-foreground">
                                Processed: {formatDate(verification.verified_at)}
                              </p>
                            )}
                            {verification.notes && (
                              <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/30 rounded">
                                {verification.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={getStatusBadge(verification.status)}>
                          {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Info */}
          {user && (
            <div className="text-center text-sm text-muted-foreground mt-8">
              Logged in as: <span className="text-foreground">{user.email}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
