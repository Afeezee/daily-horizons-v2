import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Send, Loader2, Upload, Sparkles, X, Edit3, Wand2, Shield } from "lucide-react";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import FactCheckPanel from "../articles/FactCheckPanel";
import AuthorBioCard from "./AuthorBioCard";

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

const DAILY_POST_LIMIT = 5;

async function checkDailyPostLimit(user) {
  // Admins and exempt users skip the limit
  if (user.role === "admin" || user.daily_post_limit_exempt) {
    return { allowed: true, remaining: Infinity };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const allUserArticles = await base44.entities.Article.filter(
    { created_by: user.email },
    "-created_date",
    100
  );

  const todayCount = allUserArticles.filter(
    (a) => new Date(a.created_date) >= todayStart
  ).length;

  return {
    allowed: todayCount < DAILY_POST_LIMIT,
    remaining: Math.max(0, DAILY_POST_LIMIT - todayCount),
    count: todayCount,
  };
}

export default function ArticleEditor({ article, user, publisherProfile, onClose }) {
  const [formData, setFormData] = useState({
    title: article?.title || "",
    subtitle: article?.subtitle || "",
    body: article?.body || "",
    summary: article?.summary || "",
    category: article?.category || "News",
    labels: article?.labels || [],
    tags: article?.tags?.join(", ") || "",
    lead_image_url: article?.lead_image_url || "",
    meta_title: article?.meta_title || "",
    meta_description: article?.meta_description || "",
    reading_time: article?.reading_time || 5,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isAugmenting, setIsAugmenting] = useState(false);
  const [showAugmentDialog, setShowAugmentDialog] = useState(false);
  const [augmentedContent, setAugmentedContent] = useState("");
  const [showFactCheck, setShowFactCheck] = useState(false);
  const [showFactCheckCorrectionDialog, setShowFactCheckCorrectionDialog] = useState(false);
  const [factCheckCorrectedContent, setFactCheckCorrectedContent] = useState("");
  const [factCheckResults, setFactCheckResults] = useState(null);

  // Auto-open fact-check correction dialog if article was edited from dashboard with corrections
  useEffect(() => {
    if (article?._autoOpenFactCheckCorrection && article?._factCheckCorrectedContent) {
      setFactCheckCorrectedContent(article._factCheckCorrectedContent);
      setFactCheckResults(article._factCheckData);
      setShowFactCheckCorrectionDialog(true);
    }
  }, [article]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLabelToggle = (label) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.includes(label)
        ? prev.labels.filter(l => l !== label)
        : [...prev.labels, label]
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleInputChange("lead_image_url", file_url);
    } catch (error) {
      console.error("Error uploading image:", error);
    }
    setIsUploading(false);
  };

  const handleOpenImagePrompt = () => {
    if (!formData.title) {
      alert("Please add a title first");
      return;
    }
    
    const defaultPrompt = `Professional news article header image for: ${formData.title}. Modern, high quality, editorial style.`;
    setImagePrompt(defaultPrompt);
    setShowPromptDialog(true);
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      alert("Please enter a prompt for image generation");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: imagePrompt,
      });
      handleInputChange("lead_image_url", url);
      setShowPromptDialog(false);
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Error generating image. Please try again.");
    }
    setIsGeneratingImage(false);
  };

  const handleAugmentContent = async () => {
    if (!formData.body || formData.body.length < 50) {
      alert("Please write some content first (at least 50 characters)");
      return;
    }

    setIsAugmenting(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional editor and journalist. Rewrite and enhance the following article to make it more engaging, well-structured, and professionally written while ensuring it meets publication standards.

Article Details:
- Title: ${formData.title}
- Category: ${formData.category}
- Labels: ${formData.labels.join(", ")}
- Current Content: ${formData.body.replace(/<[^>]*>/g, ' ')}

CONTENT GUIDELINES:
1. Maintain the core facts and message - do not alter factual claims
2. Improve clarity, flow, and readability
3. Use appropriate tone for ${formData.category} journalism
4. Add engaging transitions between paragraphs
5. Ensure proper structure: introduction, body, conclusion
6. Use compelling language suitable for the category
7. Return the content in clean HTML format with <p> tags for paragraphs
8. CRITICAL SPACING REQUIREMENT: After EVERY closing </p> tag, you MUST add an empty paragraph <p></p> or a <br> tag for visual spacing
9. Example of correct format: <p>First paragraph content here.</p><p></p><p>Second paragraph content here.</p><p></p><p>Third paragraph...</p>
10. This blank line spacing is MANDATORY after each and every paragraph without exception

MODERATION COMPLIANCE:
- Ensure the rewritten content will pass moderation by being factual, professional, and well-sourced
- Maintain journalistic integrity - keep critical perspectives but ensure they are backed by facts
- Avoid sensationalism or inflammatory language while keeping the content engaging
- For sensitive topics (politics, national security, etc.), use neutral, professional language that presents facts clearly
- Ensure claims are presented with appropriate context and attribution

Return ONLY the rewritten HTML content with mandatory blank lines after each paragraph.`,
        response_json_schema: {
          type: "object",
          properties: {
            rewritten_content: { type: "string" }
          }
        }
      });

      setAugmentedContent(result.rewritten_content);
      setShowAugmentDialog(true);
    } catch (error) {
      console.error("Error augmenting content:", error);
      alert("Error enhancing content. Please try again.");
    } finally {
      setIsAugmenting(false);
    }
  };

  const handleAcceptAugmented = () => {
    handleInputChange("body", augmentedContent);
    setShowAugmentDialog(false);
    setAugmentedContent("");
  };

  const handleFactCheckRegenerate = (correctedContent, factCheckData) => {
    setFactCheckCorrectedContent(correctedContent);
    setFactCheckResults(factCheckData);
    setShowFactCheckCorrectionDialog(true);
  };

  const handleAcceptFactCheckCorrection = () => {
    handleInputChange("body", factCheckCorrectedContent);
    setShowFactCheckCorrectionDialog(false);
    setShowFactCheck(false);
    setFactCheckCorrectedContent("");
    setFactCheckResults(null);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // Check daily limit only for new articles (not edits)
      if (!article) {
        const limitCheck = await checkDailyPostLimit(user);
        if (!limitCheck.allowed) {
          alert(`You've reached your daily limit of ${DAILY_POST_LIMIT} posts. You have ${limitCheck.remaining} posts remaining today. Please try again tomorrow.`);
          setIsSaving(false);
          return;
        }
      }

      const articleData = {
        ...formData,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        author_name: user.display_name || user.full_name,
        status: "draft",
      };

      if (article) {
        await base44.entities.Article.update(article.id, articleData);
      } else {
        await base44.entities.Article.create(articleData);
      }

      onClose();
    } catch (error) {
      console.error("Error saving draft:", error);
    }
    setIsSaving(false);
  };

  const handlePublish = async () => {
    if (!formData.title || !formData.body || !formData.category) {
      alert("Please fill in at least title, body, and category");
      return;
    }

    setIsPublishing(true);
    try {
      // Server-side publishing pipeline (F1/F7): one call, atomic.
      // The server runs AI moderation, enforces the daily limit, logs to
      // moderation_events, and sets `status` to published / pending_review /
      // rejected based on verdict + the REQUIRE_ADMIN_APPROVAL flag.
      const payload = {
        id: article?.id,
        title: formData.title,
        subtitle: formData.subtitle,
        body: formData.body,
        summary: formData.summary,
        category: formData.category,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        labels: formData.labels,
        lead_image_url: formData.lead_image_url,
        meta_title: formData.meta_title,
        meta_description: formData.meta_description,
        reading_time: formData.reading_time,
      };
      const { verdict, moderation_notes } = await api.articles.submit(payload);

      if (verdict === "approved") {
        alert("Article published successfully!");
      } else if (verdict === "flagged_for_review") {
        alert(`Submitted for admin review. Notes:\n\n${moderation_notes}`);
      } else if (verdict === "degraded") {
        alert("Submitted — AI moderation unavailable; an admin will review before it publishes.");
      } else {
        alert(`Article not published:\n\n${moderation_notes}`);
      }

      onClose();
    } catch (error) {
      console.error("Error publishing article:", error);
      if (error?.status === 429) {
        alert(error.message || "You've reached today's publishing limit.");
      } else {
        alert("Error publishing article. Please try again.");
      }
    }
    setIsPublishing(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={onClose} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="ml-2">Save Draft</span>
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing} className="gap-2">
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Publish
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Article headline"
              className="text-2xl font-bold border-0 border-b-2 rounded-none px-0 focus-visible:ring-0"
            />
          </div>

          {/* Subtitle */}
          <div>
            <Label htmlFor="subtitle">Subtitle / Kicker</Label>
            <Input
              id="subtitle"
              value={formData.subtitle}
              onChange={(e) => handleInputChange("subtitle", e.target.value)}
              placeholder="Optional subtitle or summary line"
            />
          </div>

          {/* Lead Image */}
          <div>
            <Label>Lead Image</Label>
            <div className="space-y-3">
              {formData.lead_image_url && (
                <div className="relative w-full h-64 rounded-lg overflow-hidden">
                  <img src={formData.lead_image_url} alt="Lead" className="w-full h-full object-cover" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => handleInputChange("lead_image_url", "")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('imageUpload').click()}
                  disabled={isUploading}
                  className="gap-2"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload Image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenImagePrompt}
                  disabled={isGeneratingImage}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate with AI
                </Button>
              </div>
              <input
                id="imageUpload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Category and Labels */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Labels / Subcategories</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {subcategories[formData.category]?.map(label => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleLabelToggle(label)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      formData.labels.includes(label)
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Body with AI Augmentation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Article Body *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAugmentContent}
                disabled={isAugmenting || !formData.body}
                className="gap-2"
              >
                {isAugmenting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    AI Enhance
                  </>
                )}
              </Button>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-[var(--border)]">
              <ReactQuill
                theme="snow"
                value={formData.body}
                onChange={(value) => handleInputChange("body", value)}
                className="min-h-96"
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['blockquote', 'code-block'],
                    ['link', 'image'],
                    ['clean']
                  ]
                }}
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <Label htmlFor="summary">Summary (for Daily Digest)</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => handleInputChange("summary", e.target.value)}
              placeholder="One paragraph summary (3 sentences max)"
              rows={3}
            />
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange("tags", e.target.value)}
              placeholder="e.g., climate change, politics, technology"
            />
          </div>

          {/* SEO Fields */}
          <div className="space-y-4 p-4 border border-[var(--border)] rounded-lg">
            <h3 className="font-semibold">SEO Settings</h3>
            <div>
              <Label htmlFor="meta_title">Meta Title</Label>
              <Input
                id="meta_title"
                value={formData.meta_title}
                onChange={(e) => handleInputChange("meta_title", e.target.value)}
                placeholder="SEO title (leave blank to use article title)"
              />
            </div>
            <div>
              <Label htmlFor="meta_description">Meta Description</Label>
              <Textarea
                id="meta_description"
                value={formData.meta_description}
                onChange={(e) => handleInputChange("meta_description", e.target.value)}
                placeholder="SEO description"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="reading_time">Estimated Reading Time (minutes)</Label>
              <Input
                id="reading_time"
                type="number"
                value={formData.reading_time}
                onChange={(e) => handleInputChange("reading_time", parseInt(e.target.value))}
                min="1"
              />
            </div>
          </div>

          {/* Author Bio Preview */}
          {publisherProfile && publisherProfile.bio && (
            <div>
              <Label className="mb-2 block">Author Bio Preview (shown below your articles)</Label>
              <AuthorBioCard 
                profile={publisherProfile}
                authorName={user.display_name || user.full_name}
                authorEmail={user.email}
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Edit your bio in your account settings or from the Publisher Dashboard.
              </p>
            </div>
          )}

          {/* Fact Check Section */}
          {formData.title && formData.body && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Fact Check Your Article
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFactCheck(!showFactCheck)}
                >
                  {showFactCheck ? "Hide" : "Show"} Fact Check
                </Button>
              </div>
              {showFactCheck && (
                <FactCheckPanel 
                  article={{ ...formData, id: article?.id }} 
                  onRegenerateRequest={handleFactCheckRegenerate}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Image Generation Dialog */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-800">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500 dark:ring-offset-gray-950 dark:focus:ring-gray-300 dark:data-[state=open]:bg-gray-800 dark:data-[state=open]:text-gray-400 bg-white dark:bg-gray-800 p-2">
            <X className="h-4 w-4 text-gray-900 dark:text-gray-100" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Generate AI Image
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Customize the prompt below to generate the perfect header image for your article
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="imagePrompt" className="mb-2 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Edit3 className="w-4 h-4" />
                Image Generation Prompt
              </Label>
              <Textarea
                id="imagePrompt"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                rows={6}
                className="font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Be specific and descriptive. Include details about style, mood, colors, and composition.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">💡 Tips for better results:</h4>
              <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Be specific about the subject matter and style (e.g., "photorealistic", "illustration", "editorial")</li>
                <li>• Include mood and atmosphere keywords (e.g., "professional", "modern", "dramatic")</li>
                <li>• Mention specific elements you want featured</li>
                <li>• Avoid requesting text or logos in the image</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPromptDialog(false)}
                disabled={isGeneratingImage}
                className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Content Augmentation Dialog */}
      <Dialog open={showAugmentDialog} onOpenChange={setShowAugmentDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden bg-white dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-800">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500 dark:ring-offset-gray-950 dark:focus:ring-gray-300 dark:data-[state=open]:bg-gray-800 dark:data-[state=open]:text-gray-400 bg-white dark:bg-gray-800 p-2 z-50">
            <X className="h-4 w-4 text-gray-900 dark:text-gray-100" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader className="border-b border-gray-200 dark:border-gray-800 pb-4">
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              AI-Enhanced Content
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Review the AI-enhanced version of your article below
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(85vh-180px)] py-4">
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  <strong>Note:</strong> The AI has restructured and enhanced your content for better readability and engagement.
                  Review carefully before accepting.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="bg-gray-200 dark:bg-gray-800 px-4 py-2 border-b-2 border-gray-300 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Original Content</h4>
                  </div>
                  <div 
                    className="p-4 max-h-96 overflow-y-auto text-gray-800 dark:text-gray-300 prose prose-sm dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: formData.body }}
                  />
                </div>

                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg border-2 border-green-300 dark:border-green-800 overflow-hidden">
                  <div className="bg-green-200 dark:bg-green-900 px-4 py-2 border-b-2 border-green-300 dark:border-green-700">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                      Enhanced Content
                    </h4>
                  </div>
                  <div 
                    className="p-4 max-h-96 overflow-y-auto text-gray-800 dark:text-gray-300 prose prose-sm dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: augmentedContent }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={() => setShowAugmentDialog(false)}
              className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Keep Original
            </Button>
            <Button
              onClick={handleAcceptAugmented}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Use Enhanced Version
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fact-Check Correction Dialog */}
      <Dialog open={showFactCheckCorrectionDialog} onOpenChange={setShowFactCheckCorrectionDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden bg-white dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-800">
          <DialogHeader className="border-b border-gray-200 dark:border-gray-800 pb-4">
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Fact-Check Corrected Content
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Review the AI-corrected version based on fact-check findings
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(85vh-180px)] py-4">
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/50 p-4 rounded-lg border-2 border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">
                  <strong>Corrections Applied:</strong> The AI has corrected factual inaccuracies found during fact-checking 
                  while maintaining your article's voice and structure. Review carefully before accepting.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="bg-gray-200 dark:bg-gray-800 px-4 py-2 border-b-2 border-gray-300 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">Original Content</h4>
                  </div>
                  <div 
                    className="p-4 max-h-96 overflow-y-auto text-gray-800 dark:text-gray-300 prose prose-sm dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: formData.body }}
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-300 dark:border-blue-800 overflow-hidden">
                  <div className="bg-blue-200 dark:bg-blue-900 px-4 py-2 border-b-2 border-blue-300 dark:border-blue-700">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Corrected Content
                    </h4>
                  </div>
                  <div 
                    className="p-4 max-h-96 overflow-y-auto text-gray-800 dark:text-gray-300 prose prose-sm dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: factCheckCorrectedContent }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={() => setShowFactCheckCorrectionDialog(false)}
              className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Keep Original
            </Button>
            <Button
              onClick={handleAcceptFactCheckCorrection}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Shield className="w-4 h-4" />
              Use Corrected Version
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}