import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User, Bookmark, Settings, LogOut, PenSquare, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ArticleCard from "../components/articles/ArticleCard";
import BioEditor from "../components/publisher/BioEditor";

export default function MyAccount() {
  const [user, setUser] = useState(null);

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

  const { data: savedArticles, isLoading: savedLoading } = useQuery({
    queryKey: ['savedArticles', user?.email],
    queryFn: async () => {
      const saved = await base44.entities.SavedArticle.filter({ created_by: user.email });
      const articleIds = saved.map(s => s.article_id);
      
      if (articleIds.length === 0) return [];
      
      // Fetch all saved articles
      const articles = await base44.entities.Article.list();
      return articles.filter(a => articleIds.includes(a.id));
    },
    enabled: !!user,
    initialData: [],
  });

  const queryClient = useQueryClient();

  const { data: publisherProfile } = useQuery({
    queryKey: ['publisherProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.PublisherProfile.filter({ created_by: user.email });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  const { data: digestPreferences } = useQuery({
    queryKey: ['digestPreferences', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.DigestPreference.filter({ created_by: user.email });
      return prefs[0] || null;
    },
    enabled: !!user,
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background)] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-2xl font-bold">
              {user.display_name?.[0]?.toUpperCase() || user.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{user.display_name || user.full_name}</h1>
              <p className="text-[var(--muted-foreground)]">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="saved" className="space-y-6">
          <TabsList className="grid w-full md:w-auto grid-cols-3 bg-[var(--muted)]">
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="w-4 h-4" />
              Saved Articles
            </TabsTrigger>
            <TabsTrigger value="bio" className="gap-2">
              <PenSquare className="w-4 h-4" />
              Author Bio
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle>Your Saved Articles</CardTitle>
              </CardHeader>
              <CardContent>
                {savedLoading ? (
                  <p className="text-center py-8 text-[var(--muted-foreground)]">Loading...</p>
                ) : savedArticles.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {savedArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} compact />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bookmark className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                    <p className="text-[var(--muted-foreground)] mb-4">
                      No saved articles yet
                    </p>
                    <Link to={createPageUrl("Home")}>
                      <Button>Browse Articles</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bio">
            {publisherProfile ? (
              <BioEditor
                profile={publisherProfile}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['publisherProfile'] })}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <PenSquare className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                  <p className="text-[var(--muted-foreground)] mb-4">
                    Set up your author profile by visiting the Publisher Dashboard first.
                  </p>
                  <Link to={createPageUrl("PublisherDashboard")}>
                    <Button>Go to Publisher Dashboard</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Full Name</label>
                      <p className="text-[var(--muted-foreground)]">{user.full_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-[var(--muted-foreground)]">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Account Type</label>
                      <p className="text-[var(--muted-foreground)] capitalize">{user.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Digest</CardTitle>
                </CardHeader>
                <CardContent>
                  {digestPreferences ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <p className="text-[var(--muted-foreground)]">
                          {digestPreferences.is_active ? "Active" : "Paused"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Frequency</label>
                        <p className="text-[var(--muted-foreground)] capitalize">
                          {digestPreferences.frequency.replace("_", " ")}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Delivery Time</label>
                        <p className="text-[var(--muted-foreground)]">
                          {digestPreferences.delivery_time}
                        </p>
                      </div>
                      <Link to={createPageUrl("DailyDigest")}>
                        <Button variant="outline" className="mt-4">
                          Edit Digest Settings
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[var(--muted-foreground)] mb-4">
                        You haven't configured your daily digest yet.
                      </p>
                      <Link to={createPageUrl("DailyDigest")}>
                        <Button>Setup Daily Digest</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Breaking News Alerts</label>
                      <p className="text-[var(--muted-foreground)]">
                        {user.preferences?.breaking_news_alerts ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      More notification settings coming soon
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete your account, all your published articles, saved items, comments, and preferences. This action cannot be reversed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={async () => {
                            // Delete publisher profile, articles, saved articles, likes, digest prefs
                            const [profiles, articles, saved, likes, prefs] = await Promise.all([
                              base44.entities.PublisherProfile.filter({ created_by: user.email }),
                              base44.entities.Article.filter({ created_by: user.email }),
                              base44.entities.SavedArticle.filter({ created_by: user.email }),
                              base44.entities.ArticleLike.filter({ created_by: user.email }),
                              base44.entities.DigestPreference.filter({ created_by: user.email }),
                            ]);
                            await Promise.all([
                              ...profiles.map(p => base44.entities.PublisherProfile.delete(p.id)),
                              ...articles.map(a => base44.entities.Article.delete(a.id)),
                              ...saved.map(s => base44.entities.SavedArticle.delete(s.id)),
                              ...likes.map(l => base44.entities.ArticleLike.delete(l.id)),
                              ...prefs.map(p => base44.entities.DigestPreference.delete(p.id)),
                            ]);
                            base44.auth.logout();
                          }}
                        >
                          Yes, Delete My Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}