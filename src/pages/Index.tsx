import { Shield, CheckCircle, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMC0zMHY2aDZ2LTZoLTZ6bTAgMTJ2Nmg2di02aC02em0wIDEydjZoNnYtNmgtNnptLTEyLTZoNnYtNmgtNnY2em0wIDEyaDZ2LTZoLTZ2NnptMCAxMmg2di02aC02djZ6bTAtMzZoNnYtNmgtNnY2em0tMTIgMTJoNnYtNmgtNnY2em0wIDEyaDZ2LTZoLTZ2NnptMCAxMmg2di02aC02djZ6bTAtMzZoNnYtNmgtNnY2em0tMTIgMjRoNnYtNmgtNnY2em0wIDEyaDZ2LTZoLTZ2NnptMC0zNmg2di02aC02djZ6bTAgMTJoNnYtNmgtNnY2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <nav className="container mx-auto px-4 py-6 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary" />
            <span className="font-display text-3xl tracking-wide text-foreground">MILVERIFY</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden md:inline-flex">About</Button>
            <Button variant="ghost" className="hidden md:inline-flex">FAQ</Button>
            <ThemeToggle />
            <Button className="bg-primary hover:bg-primary/90">Get Verified</Button>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-tight text-foreground mb-6">
              MILITARY
              <br />
              <span className="text-primary">VERIFICATION</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-xl">
              Secure, fast, and trusted verification for active duty, veterans, and military families.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8">
                Start Verification
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-card">
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
            <Card className="bg-background border-border hover:border-primary/50 transition-colors">
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

            <Card className="bg-background border-border hover:border-primary/50 transition-colors">
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

            <Card className="bg-background border-border hover:border-primary/50 transition-colors">
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
      <section className="py-20 bg-primary text-primary-foreground">
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
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 text-center">
          <Users className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
            READY TO GET VERIFIED?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Join thousands of verified military members and start accessing exclusive benefits today.
          </p>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-12">
            Start Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
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
