import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import ArticleCard from "../components/articles/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Search as SearchIcon } from "lucide-react";

export default function Search() {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get("q");

  const { data: articles, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      const allArticles = await base44.entities.Article.filter(
        { status: "published" },
        "-published_date",
        100
      );

      // Client-side search across title, subtitle, tags, and body
      const searchLower = query.toLowerCase();
      return allArticles.filter(article => {
        return (
          article.title?.toLowerCase().includes(searchLower) ||
          article.subtitle?.toLowerCase().includes(searchLower) ||
          article.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
          article.body?.toLowerCase().includes(searchLower)
        );
      });
    },
    enabled: !!query,
    initialData: [],
  });

  return (
    <div className="bg-[var(--background)] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <SearchIcon className="w-8 h-8 text-[var(--primary)]" />
            <h1 className="text-4xl font-bold">Search Results</h1>
          </div>
          <p className="text-xl text-[var(--muted-foreground)]">
            Showing results for: <span className="font-semibold text-[var(--foreground)]">"{query}"</span>
          </p>
          {!isLoading && (
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              Found {articles.length} {articles.length === 1 ? 'article' : 'articles'}
            </p>
          )}
        </div>

        {/* Results Grid */}
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
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4" />
            <p className="text-[var(--muted-foreground)] text-lg mb-2">
              No results found for "{query}"
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Try different keywords or browse by category
            </p>
          </div>
        )}
      </div>
    </div>
  );
}