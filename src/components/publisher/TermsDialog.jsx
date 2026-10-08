import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle } from "lucide-react";

export default function TermsDialog({ onAccept, onDecline }) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Publisher Terms & Conditions</DialogTitle>
          <DialogDescription>
            Please read and accept our publishing guidelines before continuing
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-2">1. Content Standards</h3>
              <p className="text-[var(--muted-foreground)]">
                All articles published on Daily Horizons must adhere to the highest standards of journalism.
                Content must be:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--muted-foreground)]">
                <li>Factually accurate and well-researched</li>
                <li>Free from derogatory language or personal attacks</li>
                <li>Non-defamatory and respectful</li>
                <li>Original or properly attributed</li>
                <li>Free from misinformation or propaganda</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">2. Editorial Process</h3>
              <p className="text-[var(--muted-foreground)]">
                All submitted articles undergo AI-powered moderation to ensure compliance with our standards.
                Articles may be rejected if they violate our content policies. We reserve the right to edit
                headlines and formatting for clarity and consistency.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">3. Rights & Ownership</h3>
              <p className="text-[var(--muted-foreground)]">
                By publishing on Daily Horizons, you grant us a non-exclusive license to display, distribute,
                and promote your content. You retain full ownership and can republish elsewhere. You confirm
                that you have the right to publish all content, including images and quotes.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">4. Code of Conduct</h3>
              <p className="text-[var(--muted-foreground)]">
                Publishers must:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-[var(--muted-foreground)]">
                <li>Maintain professional standards in all communications</li>
                <li>Disclose conflicts of interest</li>
                <li>Respect reader privacy and data protection laws</li>
                <li>Respond constructively to feedback and criticism</li>
                <li>Not engage in spam, manipulation, or fraudulent practices</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">5. Liability</h3>
              <p className="text-[var(--muted-foreground)]">
                Publishers are responsible for the accuracy and legality of their content. Daily Horizons
                is not liable for publisher content, but reserves the right to remove content that violates
                these terms or applicable laws.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">6. Account Termination</h3>
              <p className="text-[var(--muted-foreground)]">
                We reserve the right to suspend or terminate publisher accounts that repeatedly violate
                these terms or engage in behavior harmful to the platform or its users.
              </p>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onDecline}>
            Decline
          </Button>
          <Button onClick={onAccept} className="gap-2 bg-[var(--primary)]">
            <CheckCircle className="w-4 h-4" />
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}