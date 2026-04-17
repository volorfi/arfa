import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-2">About Us</h1>
        <div className="h-1 w-16 bg-primary rounded mb-10" />

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-[15px] leading-relaxed text-foreground/90">
          <p className="text-lg font-medium text-foreground">
            ARFA is a founder-led analytical platform built for serious market thinking.
          </p>

          <p>
            We created ARFA for people who want more than headlines, recycled narratives, or generic market commentary.
          </p>

          <p>
            The platform exists to bring structure, clarity, and judgment to complex financial questions — across macro, fixed income, equities, currencies, commodities, and broader capital allocation.
          </p>

          <p>
            ARFA is not built as a media machine and not designed for noise. It is built as a high-signal analytical project: selective in tone, global in perspective, and disciplined in the way it approaches markets.
          </p>

          <p>We believe that good analysis should do three things well.</p>
          <ul className="list-none space-y-2 pl-0">
            <li className="flex items-start gap-2"><span className="text-primary mt-1.5 text-xs">&#9679;</span> It should reduce noise.</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-1.5 text-xs">&#9679;</span> It should improve decision quality.</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-1.5 text-xs">&#9679;</span> And it should remain intellectually honest even when markets refuse to be simple.</li>
          </ul>

          <p className="font-medium text-foreground">Our approach is shaped by a few core principles.</p>

          <div className="grid gap-6 sm:grid-cols-2 my-8">
            {[
              { title: "Clarity over clutter", desc: "Markets are already complex. Analysis should make them more understandable, not more theatrical." },
              { title: "Structure over improvisation", desc: "Good market thinking is not a sequence of disconnected opinions. It is a framework: one that connects regime shifts, asset allocation, liquidity, risk, and time horizon." },
              { title: "Independence over product bias", desc: "ARFA is not built around selling financial inventory. The point is not to push products, but to think clearly about capital, markets, and portfolio logic." },
              { title: "Discipline over excitement", desc: "The most useful analytical work is rarely the loudest. We value preparation, consistency, and well-formed judgment over performance and noise." },
            ].map((p) => (
              <div key={p.title} className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-sm text-foreground mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          <p>
            ARFA is intentionally founder-led. That matters because serious capital questions deserve direct involvement, not a generic editorial process and not a faceless content pipeline. The platform is shaped around conviction, accountability, and a coherent worldview rather than mass production.
          </p>

          <p>We are particularly interested in the parts of markets where structure matters most:</p>
          <ul className="list-none space-y-1.5 pl-0">
            {["macro regime shifts", "fixed income and rates", "currency architecture", "portfolio resilience", "capital preservation", "the interaction between opportunity, liquidity, and risk"].map((item) => (
              <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1.5 text-xs">&#9679;</span> {item}</li>
            ))}
          </ul>

          <p>The aim is not to comment on everything. The aim is to focus on what matters.</p>

          <p>ARFA is designed for readers and clients who value:</p>
          <ul className="list-none space-y-1.5 pl-0">
            {["thoughtful market intelligence", "a global multi-asset perspective", "founder-level accountability", "a calm and selective tone", "analysis that helps build better capital decisions over time"].map((item) => (
              <li key={item} className="flex items-start gap-2"><span className="text-primary mt-1.5 text-xs">&#9679;</span> {item}</li>
            ))}
          </ul>

          <p className="text-lg font-medium text-foreground italic border-l-4 border-primary pl-4 my-8">
            In a world full of financial content, ARFA stands for something quieter and, we believe, more useful: clear thinking for serious capital.
          </p>
        </div>
      </div>
    </div>
  );
}
