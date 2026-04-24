import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface LegalPageProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export default function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
        <div className="h-1 w-16 bg-primary rounded mb-3" />
        {lastUpdated && (
          <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated}</p>
        )}

        <div className="prose prose-neutral dark:prose-invert max-w-none text-[15px] leading-relaxed text-foreground/90 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-foreground [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-foreground [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:space-y-1 [&_li]:text-foreground/85">
          {children}
        </div>
      </div>
    </div>
  );
}
