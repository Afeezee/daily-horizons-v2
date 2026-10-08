import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Clock, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function HeroSection({ articles, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-[var(--card)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="w-full h-96 rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="w-full h-44 rounded-lg" />
              <Skeleton className="w-full h-44 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return null;
  }

  const mainArticle = articles[0];
  const secondaryArticles = articles.slice(1, 3);

  return (
    <div className="bg-[var(--card)] border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Main Featured Article */}
          <Link
            to={createPageUrl("Article") + `?id=${mainArticle.id}`}
            className="group relative overflow-hidden rounded-lg"
          >
            <div className="relative h-96 overflow-hidden rounded-lg">
              {mainArticle.lead_image_url ? (
                <img
                  src={mainArticle.lead_image_url}
                  alt={mainArticle.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="mb-2">
                  <span className="px-3 py-1 bg-[var(--primary)] rounded-full text-xs font-semibold uppercase tracking-wide">
                    {mainArticle.category}
                  </span>
                </div>
                <h2 className="text-3xl font-bold mb-2 leading-tight group-hover:underline">
                  {mainArticle.title}
                </h2>
                {mainArticle.subtitle && (
                  <p className="text-lg text-gray-200 mb-3 line-clamp-2">
                    {mainArticle.subtitle}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-300">
                  <Link 
                    to={createPageUrl("Author") + `?email=${encodeURIComponent(mainArticle.created_by)}&name=${encodeURIComponent(mainArticle.author_name || mainArticle.created_by)}`}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <User className="w-4 h-4" />
                    <span>{mainArticle.author_name || mainArticle.created_by}</span>
                  </Link>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{format(new Date(mainArticle.published_date), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Secondary Featured Articles */}
          <div className="space-y-6">
            {secondaryArticles.map((article) => (
              <Link
                key={article.id}
                to={createPageUrl("Article") + `?id=${article.id}`}
                className="group block"
              >
                <div className="flex gap-4 p-4 bg-[var(--muted)] rounded-lg hover:bg-[var(--muted)]/70 transition-colors">
                  {article.lead_image_url && (
                    <div className="w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg">
                      <img
                        src={article.lead_image_url}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      <span className="px-2 py-0.5 bg-[var(--primary)] text-white rounded text-xs font-semibold uppercase">
                        {article.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <Link 
                        to={createPageUrl("Author") + `?email=${encodeURIComponent(article.created_by)}&name=${encodeURIComponent(article.author_name || article.created_by)}`}
                        className="hover:text-[var(--accent)] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {article.author_name || article.created_by}
                      </Link>
                      <span>•</span>
                      <span>{format(new Date(article.published_date), "MMM d")}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}