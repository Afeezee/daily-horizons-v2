import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { api } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Clock, User, Eye, Heart, Bookmark, Share2, MessageSquare, Shield,
  Twitter, Facebook, Linkedin, Copy, CheckCircle, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import CommentSection from "../components/articles/CommentSection";
import ShareMenu from "../components/articles/ShareMenu";
import RelatedArticles from "../components/articles/RelatedArticles";
import FactCheckPanel from "../components/articles/FactCheckPanel";
import AuthorBioCard from "../components/publisher/AuthorBioCard";

export default function Article() {
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get("id");
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showFactCheck, setShowFactCheck] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        // User not logged in - this is fine for article viewing
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

  const { data: article, isLoading } = useQuery({
    queryKey: ['article', articleId],
    queryFn: async () => {
      const articles = await base44.entities.Article.filter({ id: articleId, status: "published" });
      if (articles.length > 0) {
        // Atomic view counter (fixes F3). The old client-side Article.update
        // path was blocked by server-owned-field policy and silently no-ops;
        // the atomic endpoint rate-limits per IP+article server-side.
        api.articles.view(articleId).catch(() => {});
        return articles[0];
      }
      return null;
    },
    enabled: !!articleId,
  });

  const { data: authorProfile } = useQuery({
    queryKey: ['authorProfile', article?.created_by],
    queryFn: async () => {
      const profiles = await base44.entities.PublisherProfile.filter({ created_by: article.created_by });
      return profiles[0] || null;
    },
    enabled: !!article?.created_by,
  });

  const { data: savedArticles } = useQuery({
    queryKey: ['savedArticles', user?.email],
    queryFn: () => base44.entities.SavedArticle.filter({ created_by: user.email }),
    enabled: !!user && authChecked,
    initialData: [],
  });

  const { data: userLike } = useQuery({
    queryKey: ['articleLike', articleId, user?.email],
    queryFn: () => base44.entities.ArticleLike.filter({ article_id: articleId, created_by: user.email }),
    enabled: !!user && !!articleId && authChecked,
    initialData: [],
  });

  const isSaved = savedArticles.some(s => s.article_id === articleId);
  const isLiked = userLike.length > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return;
      }
      if (isSaved) {
        const saved = savedArticles.find(s => s.article_id === articleId);
        await base44.entities.SavedArticle.delete(saved.id);
      } else {
        await base44.entities.SavedArticle.create({ article_id: articleId });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['savedArticles', user?.email] });
      const prev = queryClient.getQueryData(['savedArticles', user?.email]);
      if (isSaved) {
        queryClient.setQueryData(['savedArticles', user?.email], (old) =>
          (old || []).filter(s => s.article_id !== articleId)
        );
      } else {
        queryClient.setQueryData(['savedArticles', user?.email], (old) =>
          [...(old || []), { article_id: articleId, id: 'temp_' + Date.now(), created_by: user?.email }]
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['savedArticles', user?.email], context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['savedArticles'] });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return;
      }
      // Atomic like / unlike — handles the ArticleLike row and the article's
      // likes_count in one transaction, independent of article-owner RLS (F3).
      if (isLiked) {
        await api.articles.unlike(articleId);
      } else {
        await api.articles.like(articleId, "like");
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['article', articleId] });
      await queryClient.cancelQueries({ queryKey: ['articleLike', articleId, user?.email] });
      const prevArticle = queryClient.getQueryData(['article', articleId]);
      const prevLike = queryClient.getQueryData(['articleLike', articleId, user?.email]);
      if (isLiked) {
        queryClient.setQueryData(['articleLike', articleId, user?.email], []);
        queryClient.setQueryData(['article', articleId], (old) =>
          old ? { ...old, likes_count: Math.max(0, (old.likes_count || 0) - 1) } : old
        );
      } else {
        queryClient.setQueryData(['articleLike', articleId, user?.email], [{ id: 'temp', article_id: articleId }]);
        queryClient.setQueryData(['article', articleId], (old) =>
          old ? { ...old, likes_count: (old.likes_count || 0) + 1 } : old
        );
      }
      return { prevArticle, prevLike };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['article', articleId], context?.prevArticle);
      queryClient.setQueryData(['articleLike', articleId, user?.email], context?.prevLike);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      queryClient.invalidateQueries({ queryKey: ['articleLike'] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="w-full h-96 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Article not found</h1>
        <Link to={createPageUrl("Home")}>
          <Button>Return to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background)]">
      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* Category Badge */}
        <div className="flex items-center gap-2 mb-4">
          <Link to={createPageUrl("Category") + `?name=${article.category}`}>
            <span className="px-3 py-1 bg-[var(--primary)] text-white rounded-full text-sm font-semibold uppercase hover:bg-[var(--primary)]/90 transition-colors">
              {article.category}
            </span>
          </Link>
          {article.labels?.map((label, i) => (
            <span key={i} className="px-3 py-1 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-full text-sm">
              {label}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
          {article.title}
        </h1>

        {/* Subtitle */}
        {article.subtitle && (
          <p className="text-xl text-[var(--muted-foreground)] mb-6">
            {article.subtitle}
          </p>
        )}

        {/* Article Meta - Updated with clickable author */}
        <div className="flex flex-wrap items-center gap-4 pb-6 mb-6 border-b border-[var(--border)]">
          <Link 
            to={createPageUrl("Author") + `?email=${encodeURIComponent(article.created_by)}&name=${encodeURIComponent(article.author_name || article.created_by)}`}
            className="flex items-center gap-2 hover:text-[var(--accent)] transition-colors"
          >
            <User className="w-5 h-5 text-[var(--muted-foreground)]" />
            <span className="font-semibold">{article.author_name || article.created_by}</span>
          </Link>
          <span className="text-[var(--muted-foreground)]">•</span>
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            <Clock className="w-4 h-4" />
            <span>{format(new Date(article.published_date || article.created_date), "MMMM d, yyyy 'at' HH:mm")}</span>
          </div>
          {article.reading_time && (
            <>
              <span className="text-[var(--muted-foreground)]">•</span>
              <span className="text-[var(--muted-foreground)]">{article.reading_time} min read</span>
            </>
          )}
          <span className="text-[var(--muted-foreground)]">•</span>
          <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
            <Eye className="w-4 h-4" />
            <span>{article.views_count || 0} views</span>
          </div>
        </div>

        {/* Lead Image */}
        {article.lead_image_url && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={article.lead_image_url}
              alt={article.title}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between py-4 mb-8 border-y border-[var(--border)]">
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => likeMutation.mutate()}
                  disabled={likeMutation.isPending}
                  className={`gap-2 ${isLiked ? 'text-red-500 border-red-500' : ''}`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  {article.likes_count || 0}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className={`gap-2 ${isSaved ? 'text-blue-500 border-blue-500' : ''}`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)}
                  className="gap-2"
                >
                  <Heart className="w-4 h-4" />
                  {article.likes_count || 0}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)}
                  className="gap-2"
                >
                  <Bookmark className="w-4 h-4" />
                  Save
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFactCheck(true)}
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              Fact Check
            </Button>
          </div>
          <ShareMenu article={article} />
        </div>

        {/* Article Body */}
        <div
          className="prose prose-lg max-w-none mb-12 article-body-content"
          dangerouslySetInnerHTML={{ __html: article.body }}
          style={{
            color: 'var(--foreground)',
            fontFamily: 'Georgia, serif',
            lineHeight: '1.8',
          }}
        />

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {article.tags.map((tag, i) => (
              <Link
                key={i}
                to={createPageUrl("Search") + `?q=${encodeURIComponent(tag)}`}
                className="px-3 py-1 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-full text-sm hover:bg-[var(--muted-foreground)] hover:text-white transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Author Bio */}
        {authorProfile && authorProfile.bio && (
          <div className="mb-12">
            <h3 className="text-lg font-bold mb-3">About the Author</h3>
            <AuthorBioCard
              profile={authorProfile}
              authorName={article.author_name || article.created_by}
              authorEmail={article.created_by}
            />
          </div>
        )}

        {/* Sign-in CTA for engagement */}
        {!user && authChecked && (
          <div className="my-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-[var(--border)]">
            <h3 className="text-xl font-bold mb-2">Enjoying this article?</h3>
            <p className="text-[var(--muted-foreground)] mb-4">
              Sign in to save articles, leave comments, and engage with our community of readers and writers.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)}>
                Sign In
              </Button>
              <Link to={createPageUrl("PublisherDashboard")}>
                <Button variant="outline">
                  Become a Publisher
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <CommentSection articleId={articleId} article={article} user={user} />
      </article>

      {/* Related Articles Sidebar */}
      <div className="bg-[var(--muted)] py-12">
        <div className="max-w-7xl mx-auto px-4">
          <RelatedArticles category={article.category} currentArticleId={articleId} />
        </div>
      </div>

      {/* Fact Check Dialog */}
      <Dialog open={showFactCheck} onOpenChange={setShowFactCheck}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-800">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500 dark:ring-offset-gray-950 dark:focus:ring-gray-300 dark:data-[state=open]:bg-gray-800 dark:data-[state=open]:text-gray-400 bg-white dark:bg-gray-800 p-2 z-50">
            <X className="h-4 w-4 text-gray-900 dark:text-gray-100" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Fact Check: {article.title}</DialogTitle>
          </DialogHeader>
          <FactCheckPanel article={article} />
        </DialogContent>
      </Dialog>
    </div>
  );
}