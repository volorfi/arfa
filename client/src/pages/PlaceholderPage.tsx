import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

export default function PlaceholderPage({ title, icon: Icon = Wrench }: { title: string; icon?: any }) {
  useEffect(() => {
    toast.info("Feature coming soon");
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-[1300px] mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Icon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
        </div>
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">{title} Coming Soon</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This feature is currently under development. Check back soon for updates.
          </p>
        </div>
      </div>
    </div>
  );
}
