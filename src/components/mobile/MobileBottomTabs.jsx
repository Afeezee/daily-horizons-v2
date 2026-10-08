import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Newspaper, Rss, User } from "lucide-react";

const tabs = [
  { name: "Home", icon: Home, page: "Home" },
  { name: "Categories", icon: Newspaper, page: "Category" },
  { name: "Digest", icon: Rss, page: "DailyDigest" },
  { name: "Account", icon: User, page: "MyAccount" },
];

export default function MobileBottomTabs({ currentPageName }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--card)] border-t border-[var(--border)] select-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = currentPageName === tab.page || 
            (tab.page === "Category" && currentPageName === "Category");
          return (
            <Link
              key={tab.page}
              to={createPageUrl(tab.page)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors select-none ${
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}