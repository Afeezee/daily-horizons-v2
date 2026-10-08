import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Newspaper, Users, Globe, Sparkles, PenSquare, Mail, Shield, Rss } from "lucide-react";

export default function About() {
  const scrollToContact = (e) => {
    e.preventDefault();
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-[var(--background)]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Newspaper className="w-10 h-10" />
          </div>
          <h1 className="text-5xl font-bold mb-6">About Daily Horizons</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            We deliver knowledge that empowers. Daily Horizons is dedicated to providing credible, insightful news, enabling you to understand the world and make informed decisions. Your access to critical information, democratized.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16 space-y-16">
        {/* Mission */}
        <section>
          <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-lg text-[var(--muted-foreground)] leading-relaxed mb-4">
            In an era of information overload and declining trust in media, Daily Horizons stands 
            as a beacon of democratic journalism. We believe that powerful, truthful storytelling 
            shouldn't be limited to traditional gatekeepers.
          </p>
          <p className="text-lg text-[var(--muted-foreground)] leading-relaxed">
            Our platform combines the credibility of professional journalism with the diverse 
            perspectives of citizen reporters, all moderated by AI to ensure factual accuracy 
            and ethical standards.
          </p>
        </section>

        {/* Core Values */}
        <section>
          <h2 className="text-3xl font-bold mb-8">What We Stand For</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg">
              <Users className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="text-xl font-bold mb-2">Democratic Access</h3>
              <p className="text-[var(--muted-foreground)]">
                Anyone with a story to tell can become a publisher, breaking down traditional 
                barriers to media participation.
              </p>
            </div>
            <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg">
              <Globe className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="text-xl font-bold mb-2">Global Perspective</h3>
              <p className="text-[var(--muted-foreground)]">
                We celebrate diverse voices from every corner of the world, ensuring no story 
                goes untold.
              </p>
            </div>
            <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg">
              <Sparkles className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="text-xl font-bold mb-2">AI-Powered Quality</h3>
              <p className="text-[var(--muted-foreground)]">
                Our AI moderation ensures all published content meets standards for accuracy, 
                professionalism, and ethical journalism.
              </p>
            </div>
            <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-lg">
              <Mail className="w-8 h-8 text-orange-600 mb-3" />
              <h3 className="text-xl font-bold mb-2">Reader-First</h3>
              <p className="text-[var(--muted-foreground)]">
                Our Daily Digest and personalized features put you in control of your news 
                consumption experience.
              </p>
            </div>
          </div>
        </section>

        {/* Unique Features */}
        <section>
          <h2 className="text-3xl font-bold mb-8">What Makes Us Different</h2>
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-300 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                    AI-Powered Fact Checking
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Every article on Daily Horizons can be fact-checked with our advanced AI system. 
                    With one click, our AI searches credible sources across the web to verify claims, 
                    providing detailed analysis with evidence and source links. This ensures transparency 
                    and helps readers make informed decisions based on verified information.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-2 border-purple-300 dark:border-purple-800 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-600 dark:bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <Rss className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                    Personalized Daily Digest
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Stay informed without the overwhelm. Our Daily Digest curates the most important 
                    stories based on your preferences, delivering them right to your inbox. Choose your 
                    categories, set your schedule, and receive a beautifully formatted email digest with 
                    articles that matter to you—all powered by intelligent curation algorithms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section>
          <h2 className="text-3xl font-bold mb-8">How Daily Horizons Works</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Write & Submit</h3>
                <p className="text-[var(--muted-foreground)]">
                  Publishers create articles with our intuitive editor, complete with rich formatting, 
                  AI-generated images, and comprehensive metadata.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-purple-600">2</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">AI Moderation</h3>
                <p className="text-[var(--muted-foreground)]">
                  Every article undergoes AI-powered review for factual accuracy, writing quality, 
                  and ethical standards before publication.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-green-600">3</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Engage & Discover</h3>
                <p className="text-[var(--muted-foreground)]">
                  Readers discover stories through our homepage, categories, search, or personalized 
                  Daily Digest, and engage through likes, comments, and social sharing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-8 rounded-lg border border-[var(--border)]">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
            <p className="text-lg text-[var(--muted-foreground)] mb-6">
              Whether you're a seasoned journalist or a first-time writer, your voice matters.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={createPageUrl("PublisherDashboard")}>
                <Button size="lg" className="gap-2">
                  <PenSquare className="w-5 h-5" />
                  Become a Publisher
                </Button>
              </Link>
              <Link to={createPageUrl("DailyDigest")}>
                <Button size="lg" variant="outline" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  Subscribe to Digest
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact-section" className="text-center scroll-mt-8">
          <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
          <p className="text-lg text-[var(--muted-foreground)] mb-6">
            Have questions, feedback, or partnership inquiries?
          </p>
          <p className="text-[var(--muted-foreground)]">
            Email us at <a href="mailto:info@cereustechnologies.com" className="text-[var(--accent)] hover:underline font-semibold">
              info@cereustechnologies.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}