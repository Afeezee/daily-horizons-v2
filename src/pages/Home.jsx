import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ArticleCard from "../components/articles/ArticleCard";
import HeroSection from "../components/home/HeroSection";
import NewsletterSignup from "../components/home/NewsletterSignup";
import TrendingPanel from "../components/home/TrendingPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, Clock, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.filter({ status: "published" }, "-published_date", 50),
    initialData: [],
  });

  const featuredArticles = articles.filter(a => a.is_featured).slice(0, 3);
  const editorPicks = articles.filter(a => a.is_editor_pick).slice(0, 6);
  const latestArticles = articles.slice(0, 12);
  const trendingArticles = [...articles].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 8);

  return (
    <div className="bg-[var(--background)]">
      {/* Hero Section */}
      <HeroSection articles={featuredArticles} isLoading={isLoading} />

      {/* Digest CTA Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Your Daily Digest Awaits</h3>
                <p className="text-blue-100">Curated news delivered on your schedule</p>
              </div>
            </div>
            <Link to={createPageUrl("DailyDigest")}>
              <Button className="bg-white text-blue-600 hover:bg-blue-50">
                Configure Your Digest
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-12">
            {/* Tabbed Content: Trending, Latest, Editor's Picks */}
            <Tabs defaultValue="latest" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-[var(--muted)]">
                <TabsTrigger value="latest" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Latest
                </TabsTrigger>
                <TabsTrigger value="trending" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="picks" className="gap-2">
                  <Star className="w-4 h-4" />
                  Editor's Picks
                </TabsTrigger>
              </TabsList>

              <TabsContent value="latest" className="mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="w-full h-48 rounded-lg" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))
                  ) : (
                    latestArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="trending" className="mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="w-full h-48 rounded-lg" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))
                  ) : (
                    trendingArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} showViews />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="picks" className="mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="w-full h-48 rounded-lg" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))
                  ) : editorPicks.length > 0 ? (
                    editorPicks.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-12 text-[var(--muted-foreground)]">
                      No editor's picks yet. Check back soon!
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Category Highlights */}
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Technology</h2>
                  <Link to={createPageUrl("Category") + "?name=Technology"} className="text-[var(--accent)] hover:underline text-sm font-medium">
                    View all →
                  </Link>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {articles.filter(a => a.category === "Technology").slice(0, 3).map((article) => (
                    <ArticleCard key={article.id} article={article} compact />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Culture</h2>
                  <Link to={createPageUrl("Category") + "?name=Culture"} className="text-[var(--accent)] hover:underline text-sm font-medium">
                    View all →
                  </Link>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {articles.filter(a => a.category === "Culture").slice(0, 3).map((article) => (
                    <ArticleCard key={article.id} article={article} compact />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Trending Panel */}
            <TrendingPanel articles={trendingArticles} isLoading={isLoading} />

            {/* Newsletter Signup */}
            <NewsletterSignup />

            {/* Popular Tags */}
            <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
              <h3 className="text-lg font-bold mb-4">Popular Tags</h3>
              <div className="flex flex-wrap gap-2">
                {['Climate Change', 'Elections', 'AI', 'Economy', 'Healthcare', 'Innovation', 'Culture Wars', 'Space'].map((tag) => (
                  <Link
                    key={tag}
                    to={createPageUrl("Search") + `?q=${encodeURIComponent(tag)}`}
                    className="px-3 py-1.5 bg-[var(--muted)] rounded-full text-sm hover:bg-[var(--muted-foreground)] hover:text-white transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}