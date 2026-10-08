import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Clock, User, Eye, MessageSquare, Heart } from "lucide-react";

export default function ArticleCard({ article, compact = false, showViews = false }) {
  return (
    <Link
      to={createPageUrl("Article") + `?id=${article.id}`}
      className="group block bg-[var(--card)] rounded-lg overflow-hidden border border-[var(--border)] hover:shadow-lg transition-all duration-300"
    >
      {article.lead_image_url && (
        <div className={`overflow-hidden ${compact ? 'h-32' : 'h-48'}`}>
          <img
            src={article.lead_image_url}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      
      <div className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 bg-[var(--primary)] text-white rounded text-xs font-semibold uppercase">
            {article.category}
          </span>
          {article.labels && article.labels[0] && (
            <span className="px-2 py-0.5 bg-[var(--muted)] text-[var(--muted-foreground)] rounded text-xs">
              {article.labels[0]}
            </span>
          )}
        </div>

        <h3 className={`font-bold mb-2 group-hover:text-[var(--accent)] transition-colors ${
          compact ? 'text-base line-clamp-2' : 'text-xl line-clamp-3'
        }`}>
          {article.title}
        </h3>

        {!compact && article.subtitle && (
          <p className="text-sm text-[var(--muted-foreground)] mb-3 line-clamp-2">
            {article.subtitle}
          </p>
        )}

        <div className={`flex items-center gap-3 text-xs text-[var(--muted-foreground)] ${compact ? 'flex-wrap' : ''}`}>
          <Link 
            to={createPageUrl("Author") + `?email=${encodeURIComponent(article.created_by)}&name=${encodeURIComponent(article.author_name || article.created_by)}`}
            className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <User className="w-3 h-3" />
            <span className="truncate">{article.author_name || article.created_by}</span>
          </Link>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{format(new Date(article.published_date || article.created_date), "MMM d")}</span>
          </div>
          {showViews && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{article.views_count || 0}</span>
              </div>
            </>
          )}
          {!compact && (
            <>
              <span>•</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  <span>{article.likes_count || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{article.comments_count || 0}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}