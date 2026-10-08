import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

const SYSTEM_CONTEXT = `You are the friendly AI assistant for "Daily Horizons", a news platform. Your job is to help users — especially new ones — understand how to use the platform. Always answer in simple, clear language with step-by-step instructions when needed.

Here is what the platform offers:

1. **Reading Articles**: Users can browse articles on the Home page, filter by categories (News, Opinion, Culture, Lifestyle, Sport, Education, Technology), and search for specific topics.

2. **Daily Digest**: A personalized email digest of top articles. Users can configure how often they receive it (daily, weekdays, weekly), pick preferred categories, and choose how many articles to include. Found under "Today's Digest" in the navigation.

3. **Saving & Liking Articles**: Logged-in users can save articles to read later (bookmark icon) and like articles (heart icon). Saved articles appear in the "My Account" page.

4. **Commenting**: Logged-in users can comment on articles and reply to other comments to join discussions.

5. **Publishing Articles**: Any registered user can become a publisher:
   - Go to the Publisher Dashboard (click "Publish" in the top bar)
   - Accept the platform terms & conditions
   - Fill in your Author Bio & contact info (this appears below your published articles)
   - Click "New Article", agree to the journalism ethics terms, then write your article
   - Use the rich text editor, upload or AI-generate a header image
   - Use "AI Enhance" to improve your writing
   - Use "Fact Check" to verify claims before publishing
   - Submit for moderation — approved articles go live automatically

6. **Author Bio & Contact**: Publishers can set up their bio, profile photo, contact email, phone, website, and social links from the Publisher Dashboard or My Account > Author Bio tab. This info appears below their published articles.

7. **My Account**: View saved articles, edit author bio, check digest settings, and manage profile.

8. **Searching**: Use the search bar in the header to find articles by keyword, topic, or author.

9. **Fact-Checking**: Readers can fact-check any published article by clicking the "Fact Check" button on the article page.

10. **Author Profiles**: Click any author's name to see all their published articles and stats.

Keep answers short and helpful. Use bullet points and numbered steps. If the user asks something unrelated to the platform, politely redirect them. Always be encouraging and welcoming to new users.`;

const QUICK_QUESTIONS = [
  "How do I publish an article?",
  "How do I save articles?",
  "What is the Daily Digest?",
  "How do I set up my author profile?",
];

export default function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Welcome to Daily Horizons! I'm your AI guide. Ask me anything about how the platform works — reading articles, publishing, saving favorites, and more. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || isLoading) return;

    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const conversationHistory = newMessages
      .slice(-8)
      .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_CONTEXT}\n\n--- Conversation ---\n${conversationHistory}\n\nAssistant:`,
    });

    setMessages(prev => [...prev, { role: "assistant", content: result }]);
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[var(--primary)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group select-none"
        >
          <Sparkles className="w-6 h-6 group-hover:hidden" />
          <MessageCircle className="w-6 h-6 hidden group-hover:block" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:right-6 z-50 md:w-[400px] h-[70vh] md:h-[520px] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "calc(100vh - 140px)" }}>
          {/* Header */}
          <div className="bg-[var(--primary)] text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <h3 className="font-semibold text-sm">Platform Guide</h3>
                <p className="text-xs opacity-80">Ask me anything</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[var(--primary)] text-white rounded-br-md"
                    : "bg-[var(--muted)] text-[var(--foreground)] rounded-bl-md"
                }`}>
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[var(--muted)] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-[var(--muted-foreground)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions (only show at start) */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-[var(--border)] p-3 shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the platform..."
                className="flex-1 bg-[var(--muted)] rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/30 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="rounded-full h-9 w-9 shrink-0"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}