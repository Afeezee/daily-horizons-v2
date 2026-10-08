import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ArticleCard from "../components/articles/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { User, FileText, Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Author() {
  const urlParams = new URLSearchParams(window.location.search);
  const authorEmail = urlParams.get("email");
  const authorName = urlParams.get("name");

  const { data: articles, isLoading } = useQuery({
    queryKey: ['authorArticles', authorEmail, authorName],
    queryFn: async () => {
      // Agent-written articles have created_by === AGENT_AUTHOR_EMAIL (migration
      // mapped the old "anonymous" sentinel to that address). Match by
      // created_by first, author_name as a fallback.
      const allPublished = await base44.entities.Article.filter(
        { status: "published" },
        "-published_date",
        200
      );
      return allPublished.filter(a => {
        if (authorEmail && a.created_by === authorEmail) return true;
        if (authorName && a.author_name === authorName) return true;
        return false;
      });
    },
    enabled: !!(authorEmail || authorName),
    initialData: [],
  });

  const totalViews = articles.reduce((sum, a) => sum + (a.views_count || 0), 0);
  const totalLikes = articles.reduce((sum, a) => sum + (a.likes_count || 0), 0);

  if (!authorEmail) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--muted-foreground)] mb-4">No author specified</p>
          <Link to={createPageUrl("Home")}>
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background)] min-h-screen">
      {/* Author Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold">
              {(authorName || authorEmail)?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{authorName || authorEmail}</h1>
              <p className="text-blue-100 text-lg">Contributor at Daily Horizons</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Articles</p>
                <p className="text-2xl font-bold">{articles.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Total Views</p>
                <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Total Likes</p>
                <p className="text-2xl font-bold">{totalLikes.toLocaleString()}</p>
              </div>
              <Heart className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Avg Views</p>
                <p className="text-2xl font-bold">
                  {articles.length > 0 ? Math.round(totalViews / articles.length) : 0}
                </p>
              </div>
              <User className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Articles Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Published Articles</h2>
          
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="w-full h-48 rounded-lg" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : articles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} showViews />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[var(--card)] rounded-lg border border-[var(--border)]">
              <User className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
              <p className="text-[var(--muted-foreground)] text-lg mb-2">
                No published articles yet
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                This contributor hasn't published any articles
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}