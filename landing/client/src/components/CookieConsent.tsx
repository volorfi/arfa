import { useState, useEffect } from "react";
import { Cookie, X, Shield } from "lucide-react";
import { Link } from "wouter";

const COOKIE_CONSENT_KEY = "arfa-cookie-consent";

type ConsentStatus = "accepted" | "declined" | null;

function getConsentStatus(): ConsentStatus {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (value === "accepted" || value === "declined") return value;
    return null;
  } catch {
    return null;
  }
}

function setConsentStatus(status: "accepted" | "declined") {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, status);
  } catch {
    // localStorage not available
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    // Small delay so it doesn't flash on page load
    const timer = setTimeout(() => {
      if (getConsentStatus() === null) {
        setVisible(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setConsentStatus("accepted");
      setVisible(false);
    }, 300);
  };

  const handleDecline = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setConsentStatus("declined");
      setVisible(false);
    }, 300);
  };

  const handleDismiss = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setConsentStatus("declined");
      setVisible(false);
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[100] transition-all duration-300 ease-out ${
        animateOut
          ? "translate-y-full opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      {/* Backdrop gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-full h-16 bg-gradient-to-t from-black/10 to-transparent dark:from-black/30" />

      <div className="border-t border-border bg-card/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Icon + Text */}
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  We value your privacy
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  We use cookies and similar technologies to improve your experience, analyze site usage, and assist in our
                  marketing efforts. By clicking "Accept All", you consent to the use of all cookies. You may also choose to
                  decline non-essential cookies.{" "}
                  <Link
                    href="/cookies"
                    className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
                  >
                    <Cookie className="inline h-3 w-3" />
                    Cookie Notice
                  </Link>
                </p>
              </div>
            </div>

            {/* Right: Buttons */}
            <div className="flex items-center gap-2 shrink-0 sm:ml-4">
              <button
                onClick={handleDecline}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Accept All
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
