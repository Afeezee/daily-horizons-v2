import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHILD_PAGES = ["Article", "Author", "Search", "Category", "About"];

export default function MobileTopBar({ currentPageName, title }) {
  const navigate = useNavigate();
  const isChildPage = CHILD_PAGES.includes(currentPageName);

  if (!isChildPage) return null;

  const pageTitle = title || currentPageName;

  return (
    <div
      className="md:hidden sticky top-0 z-[60] bg-[var(--card)] border-b border-[var(--border)] select-none"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex items-center h-11 px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1 -ml-1 select-none"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </Button>
        <span className="flex-1 text-center text-sm font-semibold truncate pr-16">
          {pageTitle}
        </span>
      </div>
    </div>
  );
}