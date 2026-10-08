import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  PenSquare, FileText, Eye, Heart, MessageSquare, Plus, BarChart3, CheckCircle, Clock, XCircle
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ArticleEditor from "../components/publisher/ArticleEditor.jsx";
import PublisherStats from "../components/publisher/PublisherStats.jsx";
import ArticlesList from "../components/publisher/ArticlesList.jsx";
import TermsDialog from "../components/publisher/TermsDialog.jsx";
import NewArticleTermsDialog from "../components/publisher/NewArticleTermsDialog.jsx";
import BioEditor from "../components/publisher/BioEditor.jsx";

export default function PublisherDashboard() {
  const [user, setUser] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showNewArticleTerms, setShowNewArticleTerms] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        base44.auth.redirectToLogin();
      }
    };
    checkAuth();
  }, []);

  const { data: publisherProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['publisherProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.PublisherProfile.filter({ created_by: user.email });
      if (profiles.length > 0) {
        return profiles[0];
      }
      // Create profile if it doesn't exist
      return await base44.entities.PublisherProfile.create({
        bio: "",
        is_approved: true, // Auto-approve for demo
      });
    },
    enabled: !!user,
  });

  const { data: myArticles, isLoading: articlesLoading } = useQuery({
    queryKey: ['myArticles', user?.email],
    queryFn: () => base44.entities.Article.filter({ created_by: user.email }, "-created_date"),
    enabled: !!user,
    initialData: [],
  });

  useEffect(() => {
    if (publisherProfile && !publisherProfile.accepted_terms) {
      setShowTerms(true);
    }
  }, [publisherProfile]);

  const deleteMutation = useMutation({
    mutationFn: async (articleId) => {
      await base44.entities.Article.delete(articleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myArticles'] });
    },
  });

  const handleStartNewArticle = () => {
    if (!publisherProfile?.accepted_terms) {
      setShowTerms(true);
      return;
    }
    setShowNewArticleTerms(true);
  };

  const handleEditArticle = (article) => {
    setEditingArticle(article);
    setShowEditor(true);
  };

  const handleDeleteArticle = async (article) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${article.title}"?\n\nThis action cannot be undone.`
    );
    
    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(article.id);
      } catch (error) {
        alert("Error deleting article. Please try again.");
        console.error("Delete error:", error);
      }
    }
  };

  if (!user || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
          <p>Loading publisher dashboard...</p>
        </div>
      </div>
    );
  }

  const publishedArticles = myArticles.filter(a => a.status === "published");
  const draftArticles = myArticles.filter(a => a.status === "draft");
  // "pending_moderation" = AI call degraded, waiting on retry cron.
  // "pending_review" = AI flagged for admin review (section 7.1).
  const pendingArticles = myArticles.filter(a =>
    a.status === "pending_moderation" || a.status === "pending_review"
  );

  const totalViews = publishedArticles.reduce((sum, a) => sum + (a.views_count || 0), 0);
  const totalLikes = publishedArticles.reduce((sum, a) => sum + (a.likes_count || 0), 0);
  const totalComments = publishedArticles.reduce((sum, a) => sum + (a.comments_count || 0), 0);

  if (showEditor) {
    return (
      <ArticleEditor
        article={editingArticle}
        user={user}
        publisherProfile={publisherProfile}
        onClose={() => {
          setShowEditor(false);
          setEditingArticle(null);
          queryClient.invalidateQueries({ queryKey: ['myArticles'] });
        }}
      />
    );
  }

  return (
    <div className="bg-[var(--background)] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Publisher Dashboard</h1>
            <p className="text-[var(--muted-foreground)]">
              Welcome back, {user.display_name || user.full_name}
            </p>
          </div>
          <Button
            onClick={handleStartNewArticle}
            size="lg"
            className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 gap-2"
          >
            <Plus className="w-5 h-5" />
            New Article
          </Button>
        </div>

        {/* Stats Cards */}
        <PublisherStats
          totalArticles={publishedArticles.length}
          totalViews={totalViews}
          totalLikes={totalLikes}
          totalComments={totalComments}
        />

        {/* Author Bio Section */}
        {publisherProfile && (
          <div className="mt-8">
            <BioEditor
              profile={publisherProfile}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['publisherProfile'] })}
            />
          </div>
        )}

        {/* Articles Tabs */}
        <Tabs defaultValue="published" className="mt-8">
          <TabsList className="grid w-full md:w-auto grid-cols-3 bg-[var(--muted)]">
            <TabsTrigger value="published" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Published ({publishedArticles.length})
            </TabsTrigger>
            <TabsTrigger value="drafts" className="gap-2">
              <FileText className="w-4 h-4" />
              Drafts ({draftArticles.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending ({pendingArticles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="published" className="mt-6">
            <ArticlesList
              articles={publishedArticles}
              onEdit={handleEditArticle}
              onDelete={handleDeleteArticle}
              isLoading={articlesLoading}
              isDeleting={deleteMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="drafts" className="mt-6">
            <ArticlesList
              articles={draftArticles}
              onEdit={handleEditArticle}
              onDelete={handleDeleteArticle}
              isLoading={articlesLoading}
              isDeleting={deleteMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <ArticlesList
              articles={pendingArticles}
              onEdit={handleEditArticle}
              onDelete={handleDeleteArticle}
              isLoading={articlesLoading}
              isDeleting={deleteMutation.isPending}
              isPending
            />
          </TabsContent>
        </Tabs>
      </div>

      {showNewArticleTerms && (
        <NewArticleTermsDialog
          onAccept={() => {
            setShowNewArticleTerms(false);
            setEditingArticle(null);
            setShowEditor(true);
          }}
          onDecline={() => setShowNewArticleTerms(false)}
        />
      )}

      {showTerms && (
        <TermsDialog
          onAccept={async () => {
            await base44.entities.PublisherProfile.update(publisherProfile.id, {
              accepted_terms: true,
              terms_accepted_date: new Date().toISOString(),
            });
            setShowTerms(false);
            queryClient.invalidateQueries({ queryKey: ['publisherProfile'] });
          }}
          onDecline={() => {
            setShowTerms(false);
            window.location.href = createPageUrl("Home");
          }}
        />
      )}
    </div>
  );
}