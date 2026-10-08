import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import ArticleCard from "./ArticleCard";

export default function RelatedArticles({ category, currentArticleId }) {
  const { data: relatedArticles, isLoading } = useQuery({
    queryKey: ['relatedArticles', category],
    queryFn: () => base44.entities.Article.filter({ category, status: "published" }, "-published_date", 6),
    initialData: [],
  });

  const filteredArticles = relatedArticles.filter(a => a.id !== currentArticleId).slice(0, 3);

  if (filteredArticles.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">More in {category}</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {filteredArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}