import { Shield, CheckCircle, Users, Award, LogIn, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";

const Index = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-20" />
      <div className="fixed inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
      
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <nav className="container mx-auto px-4 py-6 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary neon-glow-text" />
            <span className="font-display text-3xl tracking-wide text-foreground">MILVERIFY</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden md:inline-flex">About</Button>
            <Button variant="ghost" className="hidden md:inline-flex">FAQ</Button>
            <ThemeToggle />
            
            {loading ? (
              <div className="w-24 h-10 bg-muted animate-pulse rounded-md" />
            ) : user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button variant="ghost" onClick={() => navigate('/admin')}>
                    <Settings className="h-5 w-5 mr-2" />
                    Admin
                  </Button>
                )}
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button className="bg-primary hover:bg-primary/90 neon-glow">
                  <LogIn className="h-5 w-5 mr-2" />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </nav>

        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-tight text-foreground mb-6">
              MILITARY
              <br />
              <span className="text-primary neon-glow-text">VERIFICATION</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-xl">
              Secure, fast, and trusted verification for active duty, veterans, and military families.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 neon-glow">
                Start Verification
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 border-primary/50 hover:bg-primary/10">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-card/50 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
              WHY CHOOSE US
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Trusted by thousands of service members and businesses worldwide
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-background/50 backdrop-blur-xl border-primary/20 hover:border-primary/50 transition-all hover:neon-glow">
              <CardHeader>
                <CheckCircle className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="font-display text-2xl">Instant Verification</CardTitle>
                <CardDescription className="text-base">
                  Get verified in minutes with our streamlined SheerID integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our system connects directly to military databases for real-time verification without lengthy paperwork.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background/50 backdrop-blur-xl border-primary/20 hover:border-primary/50 transition-all hover:neon-glow">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="font-display text-2xl">100% Secure</CardTitle>
                <CardDescription className="text-base">
                  Your data is protected with military-grade encryption
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We never store sensitive personal information. All data is encrypted and processed securely.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background/50 backdrop-blur-xl border-primary/20 hover:border-primary/50 transition-all hover:neon-glow">
              <CardHeader>
                <Award className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="font-display text-2xl">Exclusive Benefits</CardTitle>
                <CardDescription className="text-base">
                  Unlock military discounts and special offers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Once verified, access exclusive deals from our partner brands and services.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="font-display text-5xl md:text-6xl mb-2">50K+</div>
              <div className="text-primary-foreground/80 text-lg">Verified Members</div>
            </div>
            <div>
              <div className="font-display text-5xl md:text-6xl mb-2">99%</div>
              <div className="text-primary-foreground/80 text-lg">Success Rate</div>
            </div>
            <div>
              <div className="font-display text-5xl md:text-6xl mb-2">2MIN</div>
              <div className="text-primary-foreground/80 text-lg">Avg. Verification</div>
            </div>
            <div>
              <div className="font-display text-5xl md:text-6xl mb-2">500+</div>
              <div className="text-primary-foreground/80 text-lg">Partner Brands</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background relative z-10">
        <div className="container mx-auto px-4 text-center">
          <Users className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
            READY TO GET VERIFIED?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Join thousands of verified military members and start accessing exclusive benefits today.
          </p>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-12 neon-glow">
            Start Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card/50 backdrop-blur-sm border-t border-border relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <span className="font-display text-2xl text-foreground">MILVERIFY</span>
            </div>
            <div className="text-muted-foreground text-sm">
              © 2025 MilVerify. All rights reserved. Powered by SheerID.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
