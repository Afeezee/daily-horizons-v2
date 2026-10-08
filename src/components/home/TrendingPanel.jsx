import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrendingPanel({ articles, isLoading }) {
  return (
    <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)] sticky top-24">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
        <h3 className="text-lg font-bold">Trending Now</h3>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))
        ) : (
          articles.slice(0, 5).map((article, index) => (
            <Link
              key={article.id}
              to={createPageUrl("Article") + `?id=${article.id}`}
              className="flex gap-3 group"
            >
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--muted)] text-sm font-bold text-[var(--muted-foreground)]">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-[var(--accent)] transition-colors mb-1">
                  {article.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <Eye className="w-3 h-3" />
                  <span>{article.views_count || 0} views</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}