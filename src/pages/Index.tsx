import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Zap, 
  Shield, 
  History, 
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: Zap,
      title: "AI Powered",
      description: "Menggunakan AI Gemini untuk menjawab dengan akurat",
    },
    {
      icon: Shield,
      title: "Aman & Privat",
      description: "Data kamu tersimpan dengan aman di cloud",
    },
    {
      icon: History,
      title: "Riwayat Tersimpan",
      description: "Akses kembali jawaban form sebelumnya",
    },
  ];

  const steps = [
    "Paste pertanyaan dari form/kuis",
    "AI menganalisis dan menjawab",
    "Copy jawaban ke form asli",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(186_100%_50%/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(270_100%_70%/0.1),transparent_50%)]" />
      
      {/* Animated grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(186 100% 50%) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(186 100% 50%) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse" />

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">AI Form Filler</span>
            </div>
            <Link to="/auth">
              <Button variant="outline" className="border-primary/50 hover:bg-primary/10">
                Masuk
              </Button>
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <main className="container mx-auto px-4 pt-16 pb-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 text-sm animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Powered by Google Gemini AI</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight animate-fade-in">
              Jawab Kuis & Ujian
              <br />
              <span className="text-primary glow-text">Secara Otomatis</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
              Paste pertanyaan dari Google Form, kuis online, atau ujian. 
              AI akan menganalisis dan memberikan jawaban yang akurat dalam hitungan detik.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in">
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="gradient-primary text-primary-foreground font-semibold text-lg px-8 py-6 glow-primary hover:opacity-90 transition-opacity"
                >
                  Mulai Gratis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                Tidak perlu kartu kredit
              </p>
            </div>

            {/* How it works */}
            <div className="pt-16 animate-fade-in">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-8">
                Cara Kerja
              </h2>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                {steps.map((step, i) => (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-card/50 border border-border/50">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {i + 1}
                      </div>
                      <span className="font-medium">{step}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-muted-foreground hidden md:block" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="pt-20 grid md:grid-cols-3 gap-6 animate-fade-in">
              {features.map((feature, i) => (
                <div 
                  key={i} 
                  className="p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Benefits */}
            <div className="pt-16 animate-fade-in">
              <div className="inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm">
                {["Jawaban akurat", "Proses cepat", "Support pilihan ganda & essay", "Gratis untuk mulai"].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 border-t border-border/50">
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <p>© 2024 AI Form Filler. Built with Lovable.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
