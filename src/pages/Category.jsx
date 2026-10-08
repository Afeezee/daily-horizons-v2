import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ArticleCard from "../components/articles/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, Newspaper, MessageSquare, Palette, Heart, Trophy, GraduationCap, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

const allCategories = [
  { name: "News", icon: Newspaper, color: "bg-red-500" },
  { name: "Politics", icon: Newspaper, color: "bg-blue-600" },
  { name: "Business", icon: Newspaper, color: "bg-green-600" },
  { name: "Economy", icon: Newspaper, color: "bg-emerald-600" },
  { name: "Opinion", icon: MessageSquare, color: "bg-purple-600" },
  { name: "Culture", icon: Palette, color: "bg-pink-600" },
  { name: "Lifestyle", icon: Heart, color: "bg-orange-500" },
  { name: "Health", icon: Heart, color: "bg-teal-600" },
  { name: "Sport", icon: Trophy, color: "bg-yellow-600" },
  { name: "Crime", icon: Newspaper, color: "bg-gray-700" },
  { name: "Entertainment", icon: Palette, color: "bg-indigo-600" },
  { name: "Education", icon: GraduationCap, color: "bg-cyan-600" },
  { name: "Technology", icon: Cpu, color: "bg-violet-600" },
  { name: "World", icon: Newspaper, color: "bg-sky-600" },
];

export default function Category() {
  const urlParams = new URLSearchParams(window.location.search);
  const categoryName = urlParams.get("name");
  const labelFilter = urlParams.get("label");

  const { data: articles, isLoading } = useQuery({
    queryKey: ['categoryArticles', categoryName, labelFilter],
    queryFn: async () => {
      let filtered;

      if (labelFilter) {
        const allPublished = await base44.entities.Article.filter(
          { status: "published" },
          "-published_date",
          200
        );
        filtered = allPublished.filter(a => {
          const matchesLabel = a.labels && a.labels.includes(labelFilter);
          const matchesCategory = a.category === categoryName;
          return matchesLabel || matchesCategory;
        });
      } else {
        filtered = await base44.entities.Article.filter(
          { category: categoryName, status: "published" },
          "-published_date",
          50
        );
      }

      return filtered;
    },
    enabled: !!categoryName,
    initialData: [],
  });

  // Show category browsing grid when no category is selected
  if (!categoryName) {
    return (
      <div className="bg-[var(--background)] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Categories</h1>
          <p className="text-[var(--muted-foreground)] mb-8">Browse articles by topic</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allCategories.map((cat) => (
              <Link
                key={cat.name}
                to={createPageUrl("Category") + `?name=${cat.name}`}
                className="group flex flex-col items-center gap-3 p-6 bg-[var(--card)] rounded-xl border border-[var(--border)] hover:shadow-lg transition-all"
              >
                <div className={`w-12 h-12 rounded-full ${cat.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                  <cat.icon className="w-6 h-6" />
                </div>
                <span className="font-semibold text-center">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background)] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{categoryName}</h1>
          {labelFilter && (
            <p className="text-xl text-[var(--muted-foreground)]">
              Filtered by: <span className="font-semibold">{labelFilter}</span>
            </p>
          )}
          <div className="flex items-center gap-2 mt-4 text-sm text-[var(--muted-foreground)]">
            <Filter className="w-4 h-4" />
            <span>{articles.length} articles</span>
          </div>
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(9).fill(0).map((_, i) => (
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
            <p className="text-[var(--muted-foreground)] text-lg mb-4">
              No articles found in this category yet.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}