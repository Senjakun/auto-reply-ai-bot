import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Shield className="h-20 w-20 text-primary mx-auto mb-6" />
        <h1 className="font-display text-6xl text-foreground mb-4">404</h1>
        <p className="text-muted-foreground text-xl mb-8">Page not found</p>
        <Button asChild>
          <Link to="/">Return Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
