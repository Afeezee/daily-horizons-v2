import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Clock, FileText, Mail, CheckCircle, Rss, Settings, Newspaper, Send, Loader2, ChevronDown, ChevronUp, CalendarDays, X } from "lucide-react";
import { startOfDay, endOfDay, subDays, isWithinInterval, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

const categories = ["News", "Politics", "Business", "Economy", "Opinion", "Culture", "Lifestyle", "Health", "Sport", "Crime", "Entertainment", "Education", "Technology", "World"];

const subcategories = {
  News: ["Breaking", "World"],
  Politics: ["Elections", "Governance", "Policy"],
  Business: ["Markets", "Companies", "Finance"],
  Economy: ["Trade", "Inflation", "Banking"],
  Opinion: ["Editorials", "Columns", "Letters"],
  Culture: ["Arts", "Books", "Film", "Music"],
  Lifestyle: ["Food", "Travel", "Fashion"],
  Health: ["Wellness", "Medicine", "Fitness"],
  Sport: ["Football", "Athletics", "Analysis"],
  Crime: ["Courts", "Investigations", "Security"],
  Entertainment: ["Music", "Film", "Celebrities"],
  Education: ["Higher Ed", "K-12", "Research"],
  Technology: ["AI", "Startups", "Gadgets", "Science"],
  World: ["Africa", "Americas", "Europe", "Asia"],
};

export default function DailyDigest() {
  const [user, setUser] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [numArticlesToShow, setNumArticlesToShow] = useState(10);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: ['digestPreferences', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.DigestPreference.filter({ created_by: user.email });
      if (prefs.length > 0) {
        return prefs[0];
      }
      return null;
    },
    enabled: !!user,
  });

  const [scheduleSettings, setScheduleSettings] = useState({
    delivery_time: preferences?.delivery_time || "08:00",
    frequency: preferences?.frequency || "daily",
    num_articles: preferences?.num_articles || 5,
    preferred_categories: preferences?.preferred_categories || [],
    is_active: preferences?.is_active ?? true,
  });

  useEffect(() => {
    if (preferences) {
      setScheduleSettings({
        delivery_time: preferences.delivery_time || "08:00",
        frequency: preferences.frequency || "daily",
        num_articles: preferences.num_articles || 5,
        preferred_categories: preferences.preferred_categories || [],
        is_active: preferences.is_active ?? true,
      });
      setSelectedCategories(preferences.preferred_categories || []);
    }
  }, [preferences]);

  const { data: digestArticles, isLoading: articlesLoading } = useQuery({
    queryKey: ['digestArticles', selectedCategories, selectedSubcategories, numArticlesToShow, dateFrom, dateTo],
    queryFn: async () => {
      let allArticles = await base44.entities.Article.filter(
        { status: "published" },
        "-published_date",
        200
      );

      // Filter by categories if selected
      if (selectedCategories.length > 0) {
        allArticles = allArticles.filter(a => selectedCategories.includes(a.category));
      }

      // Filter by subcategories if selected
      if (selectedSubcategories.length > 0) {
        allArticles = allArticles.filter(a =>
          a.labels && a.labels.some(label => selectedSubcategories.includes(label))
        );
      }

      // Filter by date range
      if (dateFrom || dateTo) {
        allArticles = allArticles.filter(a => {
          const articleDate = new Date(a.published_date || a.created_date);
          if (dateFrom && dateTo) {
            return isWithinInterval(articleDate, {
              start: startOfDay(new Date(dateFrom)),
              end: endOfDay(new Date(dateTo)),
            });
          } else if (dateFrom) {
            return articleDate >= startOfDay(new Date(dateFrom));
          } else if (dateTo) {
            return articleDate <= endOfDay(new Date(dateTo));
          }
          return true;
        });
      }

      // Create a balanced mix of articles from different categories
      const articlesByCategory = {};
      allArticles.forEach(article => {
        if (!articlesByCategory[article.category]) {
          articlesByCategory[article.category] = [];
        }
        articlesByCategory[article.category].push(article);
      });

      Object.keys(articlesByCategory).forEach(category => {
        articlesByCategory[category].sort((a, b) => {
          const scoreA = (a.is_editor_pick ? 40 : 0) + (a.is_featured ? 30 : 0) + (a.views_count || 0) * 0.01;
          const scoreB = (b.is_editor_pick ? 40 : 0) + (b.is_featured ? 30 : 0) + (b.views_count || 0) * 0.01;
          return scoreB - scoreA;
        });
      });

      const balancedArticles = [];
      const categoryKeys = Object.keys(articlesByCategory);
      let maxLength = 0;
      if (categoryKeys.length > 0) {
        maxLength = Math.max(...categoryKeys.map(cat => articlesByCategory[cat].length));
      }

      for (let i = 0; i < maxLength; i++) {
        categoryKeys.forEach(category => {
          if (articlesByCategory[category][i]) {
            balancedArticles.push(articlesByCategory[category][i]);
          }
        });
      }

      return balancedArticles.slice(0, numArticlesToShow);
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (preferences) {
        await base44.entities.DigestPreference.update(preferences.id, scheduleSettings);
      } else {
        await base44.entities.DigestPreference.create(scheduleSettings);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digestPreferences'] });
    },
  });

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleSubcategoryToggle = (subcategory) => {
    setSelectedSubcategories(prev =>
      prev.includes(subcategory) ? prev.filter(s => s !== subcategory) : [...prev, subcategory]
    );
  };

  const handleScheduleCategoryToggle = (category) => {
    setScheduleSettings(prev => ({
      ...prev,
      preferred_categories: prev.preferred_categories.includes(category)
        ? prev.preferred_categories.filter(c => c !== category)
        : [...prev.preferred_categories, category]
    }));
  };

  const handleSendDigestEmail = async () => {
    if (!user?.email || !digestArticles || digestArticles.length === 0) return;

    setIsSendingEmail(true);
    setEmailSent(false);

    try {
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
          
          ${digestArticles.map((article, index) => `
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
            <p><strong>Daily Horizons</strong> - Empowering News and Insights</p>
            <p>Knowledge that empowers, delivered to your inbox</p>
            <p><a href="${window.location.origin}${createPageUrl("DailyDigest")}" style="color: #c41e3a;">Manage your digest preferences</a></p>
          </div>
        </body>
        </html>
      `;

      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `📰 Your Daily Horizons Digest - ${format(new Date(), "MMMM d, yyyy")}`,
        body: emailBody
      });

      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 5000);
    } catch (error) {
      console.error("Error sending digest:", error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    switch (preset) {
      case "today":
        setDateFrom(format(today, "yyyy-MM-dd"));
        setDateTo(format(today, "yyyy-MM-dd"));
        break;
      case "week":
        setDateFrom(format(subDays(today, 7), "yyyy-MM-dd"));
        setDateTo(format(today, "yyyy-MM-dd"));
        break;
      case "month":
        setDateFrom(format(subDays(today, 30), "yyyy-MM-dd"));
        setDateTo(format(today, "yyyy-MM-dd"));
        break;
      case "all":
      default:
        setDateFrom("");
        setDateTo("");
        break;
    }
  };

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
    setDatePreset("all");
  };

  // Get available subcategories based on selected categories
  const availableSubcategories = selectedCategories.length > 0
    ? selectedCategories.flatMap(cat => subcategories[cat] || [])
    : Object.values(subcategories).flat();

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rss className="w-6 h-6 text-[var(--primary)]" />
              Daily Digest
            </CardTitle>
            <CardDescription>Sign in to read your personalized news digest</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => base44.auth.redirectToLogin()} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Newspaper className="w-10 h-10" />
                <h1 className="text-4xl font-bold">Daily Digest</h1>
              </div>
              <p className="text-xl text-blue-100">
                Your personalized news briefing
              </p>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm opacity-75">{format(new Date(), "EEEE")}</p>
              <p className="text-2xl font-bold">{format(new Date(), "MMMM d, yyyy")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="digest" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="digest" className="gap-2">
              <Newspaper className="w-4 h-4" />
              Read Digest
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Settings className="w-4 h-4" />
              Schedule Settings
            </TabsTrigger>
          </TabsList>

          {/* DIGEST READER TAB */}
          <TabsContent value="digest">
            <div className="space-y-6">
              {/* Filter Bar */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Main Categories */}
                    <div>
                      <Label className="mb-2 block font-semibold">Filter by Categories</Label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(category => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => handleCategoryToggle(category)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              selectedCategories.includes(category)
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted-foreground)] hover:text-white'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      {selectedCategories.length === 0 && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-2">
                          Showing all categories
                        </p>
                      )}
                    </div>

                    {/* Date Filter */}
                    <div className="pt-2 border-t border-[var(--border)]">
                      <Label className="mb-2 block font-semibold flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        Filter by Date
                      </Label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[
                          { value: "all", label: "All Time" },
                          { value: "today", label: "Today" },
                          { value: "week", label: "Past 7 Days" },
                          { value: "month", label: "Past 30 Days" },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleDatePreset(opt.value)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              datePreset === opt.value
                                ? 'bg-blue-500 text-white'
                                : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-blue-100 dark:hover:bg-blue-900/30'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">From</Label>
                          <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                              setDateFrom(e.target.value);
                              setDatePreset("custom");
                            }}
                            className="w-40 h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">To</Label>
                          <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                              setDateTo(e.target.value);
                              setDatePreset("custom");
                            }}
                            className="w-40 h-8 text-sm"
                          />
                        </div>
                        {(dateFrom || dateTo) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearDateFilter}
                            className="gap-1 h-8 text-xs text-[var(--muted-foreground)]"
                          >
                            <X className="w-3 h-3" />
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Subcategories Toggle */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowSubcategories(!showSubcategories)}
                        className="flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
                      >
                        {showSubcategories ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Hide Sub-Categories
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Show Sub-Categories
                          </>
                        )}
                      </button>
                    </div>

                    {/* Subcategories */}
                    {showSubcategories && (
                      <div className="pt-2 border-t border-[var(--border)]">
                        <Label className="mb-2 block font-semibold text-sm">Refine by Sub-Categories</Label>
                        <div className="flex flex-wrap gap-2">
                          {availableSubcategories.map(subcategory => (
                            <button
                              key={subcategory}
                              type="button"
                              onClick={() => handleSubcategoryToggle(subcategory)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                selectedSubcategories.includes(subcategory)
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-blue-100 dark:hover:bg-blue-900/30'
                              }`}
                            >
                              {subcategory}
                            </button>
                          ))}
                        </div>
                        {selectedSubcategories.length > 0 && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-2">
                            {selectedSubcategories.length} sub-categories selected
                          </p>
                        )}
                      </div>
                    )}

                    {/* Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
                      <div className="text-sm text-[var(--muted-foreground)]">
                        {digestArticles?.length || 0} articles • Mixed from all selected categories
                      </div>
                      <div className="flex items-center gap-3">
                        <Select
                          value={numArticlesToShow.toString()}
                          onValueChange={(value) => setNumArticlesToShow(parseInt(value))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 articles</SelectItem>
                            <SelectItem value="10">10 articles</SelectItem>
                            <SelectItem value="15">15 articles</SelectItem>
                            <SelectItem value="20">20 articles</SelectItem>
                            <SelectItem value="30">30 articles</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleSendDigestEmail}
                          disabled={isSendingEmail || !digestArticles || digestArticles.length === 0}
                          className="gap-2"
                        >
                          {isSendingEmail ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : emailSent ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Sent!
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Email Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Digest Articles */}
              {articlesLoading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <div className="animate-pulse space-y-3">
                          <div className="h-6 bg-[var(--muted)] rounded w-3/4"></div>
                          <div className="h-4 bg-[var(--muted)] rounded w-full"></div>
                          <div className="h-4 bg-[var(--muted)] rounded w-5/6"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : digestArticles && digestArticles.length > 0 ? (
                <div className="space-y-4">
                  {digestArticles.map((article, index) => (
                    <Card key={article.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-lg">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-[var(--primary)] text-white rounded text-xs font-semibold uppercase">
                                {article.category}
                              </span>
                              {article.labels && article.labels.length > 0 && (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                                  {article.labels[0]}
                                </span>
                              )}
                              {article.is_editor_pick && (
                                <span className="px-2 py-1 bg-yellow-400 text-yellow-900 rounded text-xs font-semibold">
                                  Editor's Pick
                                </span>
                              )}
                              {article.is_featured && (
                                <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-semibold">
                                  Featured
                                </span>
                              )}
                            </div>

                            <Link to={createPageUrl("Article") + `?id=${article.id}`}>
                              <h3 className="text-xl font-bold mb-2 hover:text-[var(--accent)] transition-colors">
                                {article.title}
                              </h3>
                            </Link>

                            {article.subtitle && (
                              <p className="text-base text-[var(--muted-foreground)] mb-3 font-medium">
                                {article.subtitle}
                              </p>
                            )}

                            <p className="text-sm text-[var(--muted-foreground)] mb-4 leading-relaxed">
                              {article.summary || article.body.replace(/<[^>]*>/g, '').substring(0, 250) + '...'}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                                <span>By {article.author_name || article.created_by}</span>
                                <span>•</span>
                                <span>{format(new Date(article.published_date), "MMM d, yyyy")}</span>
                                <span>•</span>
                                <span>{article.reading_time} min read</span>
                              </div>
                              <Link to={createPageUrl("Article") + `?id=${article.id}`}>
                                <Button variant="outline" size="sm">
                                  Read Full Article
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <Newspaper className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">No articles found</h3>
                    <p className="text-[var(--muted-foreground)]">
                      Try adjusting your category filters or check back later
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* SCHEDULE SETTINGS TAB */}
          <TabsContent value="schedule">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Delivery Schedule
                  </CardTitle>
                  <CardDescription>Set up automated digest delivery</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-[var(--muted)] rounded-lg">
                    <div>
                      <Label htmlFor="active" className="font-semibold">Scheduled Delivery</Label>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {scheduleSettings.is_active ? "Active" : "Paused"}
                      </p>
                    </div>
                    <Switch
                      id="active"
                      checked={scheduleSettings.is_active}
                      onCheckedChange={(checked) => setScheduleSettings(prev => ({ ...prev, is_active: checked }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="time">Delivery Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduleSettings.delivery_time}
                      onChange={(e) => setScheduleSettings(prev => ({ ...prev, delivery_time: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={scheduleSettings.frequency}
                      onValueChange={(value) => setScheduleSettings(prev => ({ ...prev, frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekdays">Weekdays Only</SelectItem>
                        <SelectItem value="three_per_week">3× per Week</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="num">Articles per Digest</Label>
                    <Select
                      value={scheduleSettings.num_articles.toString()}
                      onValueChange={(value) => setScheduleSettings(prev => ({ ...prev, num_articles: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 articles</SelectItem>
                        <SelectItem value="5">5 articles</SelectItem>
                        <SelectItem value="7">7 articles</SelectItem>
                        <SelectItem value="10">10 articles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-3 block">Categories for Scheduled Digest</Label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(category => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => handleScheduleCategoryToggle(category)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            scheduleSettings.preferred_categories.includes(category)
                              ? 'bg-[var(--primary)] text-white'
                              : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-2">
                      Leave empty for all categories
                    </p>
                  </div>

                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="w-full gap-2"
                  >
                    {saveMutation.isPending ? (
                      "Saving..."
                    ) : saveMutation.isSuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Saved!
                      </>
                    ) : (
                      "Save Schedule"
                    )}
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Delivery Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--muted-foreground)] mb-4">
                      Scheduled digests will be delivered to <strong>{user.email}</strong> at{" "}
                      <strong>{scheduleSettings.delivery_time}</strong>{" "}
                      {scheduleSettings.frequency === "daily" ? "every day" : scheduleSettings.frequency.replace("_", " ")}.
                    </p>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        <strong>Note:</strong> Automated scheduling requires server-side configuration.
                        Use the "Email Copy" button in the digest reader to send immediate copies.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      How It Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-blue-600">1</span>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Curated Selection</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Articles selected based on preferences, editorial picks, and engagement
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-purple-600">2</span>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Email Delivery</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Formatted digest delivered at your preferred time
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-green-600">3</span>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Read Anytime</h4>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Click through to read full articles when convenient
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}