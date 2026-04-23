import { useState } from "react";
import { ArrowLeft, Send, Mail, Globe, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const contactMutation = trpc.contact.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send message. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error("Please fill in all fields before submitting.");
      return;
    }
    contactMutation.mutate(form);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Message Sent</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for reaching out. We will review your message and respond as soon as possible.
          </p>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="grid lg:grid-cols-5 gap-12">
          {/* Left side - Info */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Contact Us</h1>
            <div className="h-1 w-16 bg-primary rounded mb-6" />

            <p className="text-muted-foreground leading-relaxed mb-8">
              Have a question, feedback, or inquiry? We'd like to hear from you. Please use the form to send us a message, and we will respond as soon as we can.
            </p>

            <div className="space-y-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-md bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <a href="mailto:support@arfa.global" className="text-sm text-primary hover:underline">support@arfa.global</a>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-md bg-primary/10">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Website</p>
                    <a href="https://arfa.global/" className="text-sm text-primary hover:underline">arfa.global</a>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 p-4 rounded-lg border border-border/50 bg-muted/30">
              <p className="text-xs text-muted-foreground leading-relaxed">
                ARFA is an independent analytical platform. We do not provide investment advice, regulated financial services, or personal recommendations. All inquiries are handled on a best-effort basis.
              </p>
            </div>
          </div>

          {/* Right side - Form */}
          <div className="lg:col-span-3">
            <Card className="border-border/60">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Name <span className="text-destructive">*</span></label>
                      <Input
                        placeholder="Your name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Email <span className="text-destructive">*</span></label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Subject <span className="text-destructive">*</span></label>
                    <Input
                      placeholder="What is this about?"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Message <span className="text-destructive">*</span></label>
                    <Textarea
                      placeholder="Your message..."
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      required
                      className="resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={contactMutation.isPending}
                  >
                    {contactMutation.isPending ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
