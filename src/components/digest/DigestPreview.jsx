import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Clock, User, Mail, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function DigestPreview({ preferences, userEmail }) {
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const { data: articles, isLoading } = useQuery({
    queryKey: ['digestPreview', preferences],
    queryFn: async () => {
      // Get articles from the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      let query = {
        status: "published",
      };

      // Fetch all recent published articles
      let allArticles = await base44.entities.Article.filter(query, "-published_date", 100);

      // Client-side filtering by categories if specified
      if (preferences.preferred_categories && preferences.preferred_categories.length > 0) {
        allArticles = allArticles.filter(a =>
          preferences.preferred_categories.includes(a.category)
        );
      }

      // Sort by editorial priority and recency
      const sortedArticles = allArticles.sort((a, b) => {
        const scoreA = (a.is_editor_pick ? 40 : 0) + (a.is_featured ? 30 : 0) + (a.views_count || 0) * 0.01;
        const scoreB = (b.is_editor_pick ? 40 : 0) + (b.is_featured ? 30 : 0) + (b.views_count || 0) * 0.01;
        return scoreB - scoreA;
      });

      return sortedArticles.slice(0, preferences.num_articles || 5);
    },
    enabled: !!preferences,
  });

  const handleSendDigest = async () => {
    if (!userEmail || !articles || articles.length === 0) {
      setSendResult({ success: false, message: "No email or articles to send" });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      // Build HTML email content
      const emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Georgia, serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; }
            .article { border-bottom: 1px solid #eee; padding: 25px 20px; }
            .article:last-child { border-bottom: none; }
            .article-number { display: inline-block; width: 32px; height: 32px; background: #c41e3a; color: white; border-radius: 50%; text-align: center; line-height: 32px; font-weight: bold; margin-right: 10px; }
            .article-title { font-size: 20px; font-weight: bold; color: #1a1a1a; margin: 10px 0; }
            .article-category { display: inline-block; background: #c41e3a; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
            .article-summary { color: #555; margin: 10px 0; }
            .article-meta { font-size: 14px; color: #888; margin-top: 8px; }
            .read-more { display: inline-block; background: #c41e3a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px; }
            .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #888; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📰 Your Daily Horizons Digest</h1>
            <p>${format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>
          
          ${articles.map((article, index) => `
            <div class="article">
              <span class="article-number">${index + 1}</span>
              <div class="article-category">${article.category}</div>
              <div class="article-title">${article.title}</div>
              <div class="article-summary">${article.summary || article.subtitle || ''}</div>
              <div class="article-meta">
                By ${article.author_name || article.created_by} • ${format(new Date(article.published_date), "MMM d, yyyy")} • ${article.reading_time} min read
              </div>
              <a href="${window.location.origin}${createPageUrl("Article")}?id=${article.id}" class="read-more">Read Full Article →</a>
            </div>
          `).join('')}
          
          <div class="footer">
            <p><strong>Daily Horizons</strong> - Democratising News</p>
            <p>You're receiving this because you subscribed to the Daily Digest.</p>
            <p><a href="${window.location.origin}${createPageUrl("DailyDigest")}" style="color: #c41e3a;">Update your preferences</a></p>
          </div>
        </body>
        </html>
      `;

      await base44.integrations.Core.SendEmail({
        to: userEmail,
        subject: `📰 Your Daily Horizons Digest - ${format(new Date(), "MMMM d, yyyy")}`,
        body: emailBody
      });

      setSendResult({ success: true, message: "Digest sent successfully!" });
    } catch (error) {
      console.error("Error sending digest:", error);
      setSendResult({ success: false, message: "Failed to send digest. Please try again." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Digest Preview</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Based on your current preferences
            </p>
          </div>
          {userEmail && (
            <Button
              onClick={handleSendDigest}
              disabled={isSending || !articles || articles.length === 0}
              className="gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Test Email
                </>
              )}
            </Button>
          )}
        </div>
        {sendResult && (
          <div className={`mt-2 p-3 rounded-lg text-sm ${
            sendResult.success 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {sendResult.message}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="p-4 border border-[var(--border)] rounded-lg">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))
        ) : articles && articles.length > 0 ? (
          articles.map((article, index) => (
            <Link
              key={article.id}
              to={createPageUrl("Article") + `?id=${article.id}`}
              className="block p-4 border border-[var(--border)] rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-[var(--primary)] text-white rounded text-xs font-semibold uppercase">
                      {article.category}
                    </span>
                    {article.is_editor_pick && (
                      <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded text-xs font-semibold">
                        Editor's Pick
                      </span>
                    )}
                    {article.is_featured && (
                      <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs font-semibold">
                        Featured
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold mb-2 group-hover:text-[var(--accent)] transition-colors">
                    {article.title}
                  </h4>
                  <p className="text-sm text-[var(--muted-foreground)] mb-3 line-clamp-2">
                    {article.summary || article.subtitle || article.body.replace(/<[^>]*>/g, '').substring(0, 150) + '...'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{article.author_name || article.created_by}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(article.published_date), "MMM d, HH:mm")}</span>
                    </div>
                    {article.reading_time && (
                      <>
                        <span>•</span>
                        <span>{article.reading_time} min read</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            No articles match your preferences yet. Try adjusting your categories or check back later.
          </div>
        )}
      </CardContent>
    </Card>
  );
}