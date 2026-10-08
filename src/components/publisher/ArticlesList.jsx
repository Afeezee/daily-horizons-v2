
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Eye, Heart, MessageSquare, Edit, ExternalLink, AlertCircle, Trash2, Shield, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import FactCheckPanel from "../articles/FactCheckPanel";

export default function ArticlesList({ articles, onEdit, onDelete, isLoading, isDeleting = false, isPending = false }) {
  const [factCheckArticle, setFactCheckArticle] = useState(null);

  const handleFactCheckRegenerate = (correctedContent, factCheckData) => {
    // Pass the corrected content with a flag to auto-open the correction dialog
    const articleToEdit = { 
      ...factCheckArticle, 
      body: factCheckArticle.body, // Keep original body
      _factCheckCorrectedContent: correctedContent, // Pass corrected content separately
      _factCheckData: factCheckData, // Pass fact-check data
      _autoOpenFactCheckCorrection: true // Flag to auto-open the dialog
    };
    setFactCheckArticle(null);
    onEdit(articleToEdit);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-[var(--card)] p-12 rounded-lg border border-[var(--border)] text-center">
        <p className="text-[var(--muted-foreground)] mb-4">
          {isPending ? "No articles pending moderation" : "No articles yet"}
        </p>
        {!isPending && (
          <Button onClick={() => onEdit(null)}>
            Create Your First Article
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {articles.map((article) => (
          <div
            key={article.id}
            className="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)] hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col md:flex-row gap-4">
              {article.lead_image_url && (
                <div className="w-full md:w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden">
                  <img
                    src={article.lead_image_url}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold mb-1 line-clamp-2">{article.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <span className="px-2 py-0.5 bg-[var(--primary)] text-white rounded text-xs font-semibold">
                        {article.category}
                      </span>
                      <span>•</span>
                      <span>{format(new Date(article.created_date), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>

                {isPending && article.moderation_notes && (
                  <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">{article.moderation_notes}</p>
                  </div>
                )}

                {article.status === "published" && (
                  <div className="flex items-center gap-4 mb-3 text-sm text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{article.views_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span>{article.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{article.comments_count || 0}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(article)}
                    className="gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  {article.status === "published" && (
                    <Link to={createPageUrl("Article") + `?id=${article.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <ExternalLink className="w-4 h-4" />
                        View
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFactCheckArticle(article)}
                    className="gap-1"
                  >
                    <Shield className="w-4 h-4" />
                    Fact Check
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(article)}
                    disabled={isDeleting}
                    className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fact Check Dialog */}
      <Dialog open={!!factCheckArticle} onOpenChange={() => setFactCheckArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-800">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500 dark:ring-offset-gray-950 dark:focus:ring-gray-300 dark:data-[state=open]:bg-gray-800 dark:data-[state=open]:text-gray-400 bg-white dark:bg-gray-800 p-2 z-50">
            <X className="h-4 w-4 text-gray-900 dark:text-gray-100" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Fact Check: {factCheckArticle?.title}
            </DialogTitle>
          </DialogHeader>
          {factCheckArticle && (
            <FactCheckPanel 
              article={factCheckArticle} 
              onRegenerateRequest={handleFactCheckRegenerate}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
