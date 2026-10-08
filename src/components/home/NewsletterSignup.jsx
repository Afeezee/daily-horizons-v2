import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle } from "lucide-react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await base44.entities.NewsletterSubscriber.create({ email, name });
      setSubmitted(true);
      setEmail("");
      setName("");
    } catch (error) {
      console.error("Error subscribing:", error);
    }
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
          <CheckCircle className="w-6 h-6" />
          <div>
            <h3 className="font-bold">You're subscribed!</h3>
            <p className="text-sm">Check your inbox for updates.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-5 h-5 text-[var(--primary)]" />
        <h3 className="text-lg font-bold">Newsletter</h3>
      </div>
      <p className="text-sm text-[var(--muted-foreground)] mb-4">
        Get weekly highlights and editor updates delivered to your inbox.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-white dark:bg-gray-800"
        />
        <Input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white dark:bg-gray-800"
        />
        <Button
          type="submit"
          className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Subscribing..." : "Subscribe"}
        </Button>
      </form>
    </div>
  );
}