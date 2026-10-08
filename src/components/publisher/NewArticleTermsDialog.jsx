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
import { CheckCircle, Copyright, Scale, ShieldCheck } from "lucide-react";

export default function NewArticleTermsDialog({ onAccept, onDecline }) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Scale className="w-6 h-6 text-[var(--primary)]" />
            Before You Write
          </DialogTitle>
          <DialogDescription>
            Please confirm the following before creating a new article
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6 text-sm">
            {/* Copyright Section */}
            <section className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <Copyright className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-base text-blue-900 dark:text-blue-100">Copyright & Ownership</h3>
              </div>
              <ul className="space-y-2 text-blue-800 dark:text-blue-200">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                  <span><strong>You own your work.</strong> All articles you publish remain your intellectual property. Daily Horizons does not claim ownership over your content.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                  <span>You grant Daily Horizons a non-exclusive license to display and distribute your article on the platform.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                  <span>You are free to republish your work on any other platform at any time.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
                  <span>You confirm that the content is original or that you have proper rights/permissions for any third-party material used.</span>
                </li>
              </ul>
            </section>

            {/* Ethics Section */}
            <section className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-base text-amber-900 dark:text-amber-100">Journalism Ethics & Standards</h3>
              </div>
              <p className="text-amber-800 dark:text-amber-200 mb-3">
                By creating this article, you agree to uphold the following ethical standards:
              </p>
              <ul className="space-y-2 text-amber-800 dark:text-amber-200">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <span><strong>Accuracy:</strong> All facts and claims must be truthful and verifiable. Cite credible sources where possible.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <span><strong>No offensive language:</strong> Do not use derogatory, hateful, discriminatory, or vulgar language in your writing.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <span><strong>No defamation:</strong> Avoid character assassination, unsubstantiated personal attacks, or baseless accusations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <span><strong>Fairness & balance:</strong> Present multiple perspectives on controversial topics. Clearly distinguish facts from opinions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <span><strong>No misinformation:</strong> Do not publish knowingly false or misleading information, conspiracy theories, or propaganda.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <span><strong>Respect privacy:</strong> Protect the privacy of individuals unless public interest clearly outweighs privacy concerns.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <span><strong>Disclose conflicts:</strong> Declare any personal or financial interest related to the subject of your article.</span>
                </li>
              </ul>
            </section>

            {/* Moderation Notice */}
            <section className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
              <p className="text-[var(--muted-foreground)]">
                <strong>Note:</strong> All articles undergo AI-assisted moderation before publication. Articles that violate these standards may be rejected. You can use the AI enhancement tools to help ensure your content meets publication standards.
              </p>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onDecline}>
            Cancel
          </Button>
          <Button onClick={onAccept} className="gap-2 bg-[var(--primary)]">
            <CheckCircle className="w-4 h-4" />
            I Agree — Start Writing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}