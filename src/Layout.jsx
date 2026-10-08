import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  Search, Moon, Sun, User, PenSquare, Menu, X,
  ChevronDown, Newspaper, MessageSquare, Palette, Heart,
  Trophy, GraduationCap, Cpu, Home, Rss
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AIChatAssistant from "@/components/assistant/AIChatAssistant";
import MobileBottomTabs from "@/components/mobile/MobileBottomTabs";
import MobileTopBar from "@/components/mobile/MobileTopBar";
import PageTransition from "@/components/mobile/PageTransition";

const categories = [
  { name: "News", icon: Newspaper, subcategories: ["Breaking", "World"] },
  { name: "Politics", icon: Newspaper, subcategories: ["Elections", "Governance", "Policy"] },
  { name: "Business", icon: Newspaper, subcategories: ["Markets", "Companies", "Finance"] },
  { name: "Economy", icon: Newspaper, subcategories: ["Trade", "Inflation", "Banking"] },
  { name: "Opinion", icon: MessageSquare, subcategories: ["Editorials", "Columns", "Letters"] },
  { name: "Culture", icon: Palette, subcategories: ["Arts", "Books", "Film", "Music"] },
  { name: "Lifestyle", icon: Heart, subcategories: ["Food", "Travel", "Fashion"] },
  { name: "Health", icon: Heart, subcategories: ["Wellness", "Medicine", "Fitness"] },
  { name: "Sport", icon: Trophy, subcategories: ["Football", "Athletics", "Analysis"] },
  { name: "Crime", icon: Newspaper, subcategories: ["Courts", "Investigations", "Security"] },
  { name: "Entertainment", icon: Palette, subcategories: ["Music", "Film", "Celebrities"] },
  { name: "Education", icon: GraduationCap, subcategories: ["Higher Ed", "K-12", "Research"] },
  { name: "Technology", icon: Cpu, subcategories: ["AI", "Startups", "Gadgets", "Science"] },
  { name: "World", icon: Newspaper, subcategories: ["Africa", "Americas", "Europe", "Asia"] },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const logoUrl = "https://i.ibb.co/1tH3xRyp/logo.png";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser.preferences?.theme) {
          setTheme(currentUser.preferences.theme);
        }
      } catch (error) {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  // Sync with system dark mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      if (!user?.preferences?.theme) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (user) {
      await base44.auth.updateMe({
        preferences: { ...user.preferences, theme: newTheme }
      });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = createPageUrl("Search") + `?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <style>{`
        :root {
          --background: #FAFAF9;
          --foreground: #1a1a1a;
          --card: #ffffff;
          --card-foreground: #1a1a1a;
          --primary: #c41e3a;
          --primary-foreground: #ffffff;
          --secondary: #2a2a2a;
          --secondary-foreground: #ffffff;
          --muted: #f5f5f4;
          --muted-foreground: #737373;
          --accent: #0066cc;
          --border: #e7e5e4;
        }
        
        .dark {
          --background: #0a0a0a;
          --foreground: #ededed;
          --card: #1a1a1a;
          --card-foreground: #ededed;
          --primary: #ff4c5c;
          --primary-foreground: #ffffff;
          --secondary: #2a2a2a;
          --secondary-foreground: #ffffff;
          --muted: #262626;
          --muted-foreground: #a3a3a3;
          --accent: #3b82f6;
          --border: #2a2a2a;
        }
        
        body {
          background: var(--background);
          color: var(--foreground);
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
        }

        button, a, nav, [role="menuitem"], [role="tab"] {
          -webkit-user-select: none;
          user-select: none;
        }

        @supports (padding-top: env(safe-area-inset-top)) {
          .safe-top { padding-top: env(safe-area-inset-top); }
          .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
        }
      `}</style>

      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
        {/* Mobile Top Bar for child pages */}
        <MobileTopBar currentPageName={currentPageName} />

        {/* Top Bar */}
        <div className="border-b border-[var(--border)] bg-[var(--card)] safe-top">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-[var(--muted-foreground)] hidden sm:inline">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-8 select-none">
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              {user ? (
                <>
                  <Link to={createPageUrl("PublisherDashboard")}>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 select-none">
                      <PenSquare className="w-4 h-4" />
                      <span className="hidden md:inline">Publish</span>
                    </Button>
                  </Link>
                  <Link to={createPageUrl("MyAccount")} className="hidden md:inline-flex">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 select-none">
                      <User className="w-4 h-4" />
                      <span className="hidden md:inline">{user.display_name || user.full_name}</span>
                    </Button>
                  </Link>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 select-none"
                  onClick={() => base44.auth.redirectToLogin()}
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Header */}
        <header className={`sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--card)] transition-all duration-300 ${
          scrolled ? 'shadow-md' : ''
        }`}>
          <div className="max-w-7xl mx-auto px-4">
            {/* Logo and Search */}
            <div className="py-3 md:py-4 flex items-center justify-between gap-4">
              <Link to={createPageUrl("Home")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-[var(--primary)] rounded flex items-center justify-center overflow-hidden">
                  <img src={logoUrl} alt="Daily Horizons Logo" className="w-full h-full object-contain" onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8z"></path></svg>';
                  }} />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight">Daily Horizons</h1>
                  <p className="text-xs text-[var(--muted-foreground)] hidden sm:block">Empowering News and Insights</p>
                </div>
              </Link>

              <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <Input
                    type="search"
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[var(--muted)] border-0"
                  />
                </div>
              </form>

              <div className="flex items-center gap-2 md:hidden">
                <Link to={createPageUrl("Search")}>
                  <Button variant="ghost" size="icon" className="select-none">
                    <Search className="w-5 h-5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="select-none"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex flex-wrap items-center gap-1 border-t border-[var(--border)] py-1">
              <Link to={createPageUrl("Home")}>
                <Button variant="ghost" size="sm" className="font-medium select-none">
                  <Home className="w-4 h-4 mr-1.5" />
                  Home
                </Button>
              </Link>

              {categories.map((category) => (
                <DropdownMenu key={category.name}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="font-medium gap-1 select-none">
                      <category.icon className="w-4 h-4" />
                      {category.name}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl("Category") + `?name=${category.name}`}>
                        All {category.name}
                      </Link>
                    </DropdownMenuItem>
                    {category.subcategories.map((sub) => (
                      <DropdownMenuItem key={sub} asChild>
                        <Link to={createPageUrl("Category") + `?name=${category.name}&label=${sub}`}>
                          {sub}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}

              <Link to={createPageUrl("DailyDigest")}>
                <Button variant="ghost" size="sm" className="font-medium text-[var(--accent)] select-none">
                  <Rss className="w-4 h-4 mr-1.5" />
                  Today's Digest
                </Button>
              </Link>

              <Link to={createPageUrl("About")}>
                <Button variant="ghost" size="sm" className="font-medium select-none">
                  About
                </Button>
              </Link>
            </nav>
          </div>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--card)] border-b border-[var(--border)] p-4">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <Input
                  type="search"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[var(--muted)] border-0"
                />
              </div>
            </form>

            <div className="space-y-1">
              {categories.map((category) => (
                <Link key={category.name} to={createPageUrl("Category") + `?name=${category.name}`} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start select-none">
                    <category.icon className="w-4 h-4 mr-2" />
                    {category.name}
                  </Button>
                </Link>
              ))}

              <Link to={createPageUrl("About")} onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start select-none">
                  About
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Main Content — with bottom padding for mobile tab bar */}
        <main className="min-h-[calc(100vh-200px)] pb-16 md:pb-0">
          <PageTransition pageKey={location.pathname + location.search}>
            {children}
          </PageTransition>
        </main>

        {/* AI Chat Assistant */}
        <AIChatAssistant />

        {/* Mobile Bottom Tab Bar */}
        <MobileBottomTabs currentPageName={currentPageName} />

        {/* Footer — hidden on mobile for cleaner native feel, shown on desktop */}
        <footer className="hidden md:block border-t border-[var(--border)] bg-[var(--card)] mt-16">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Newspaper className="w-6 h-6 text-[var(--primary)]" />
                  <h3 className="font-bold text-lg">Daily Horizons</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  We deliver knowledge that empowers. Daily Horizons is dedicated to providing credible, insightful news, enabling you to understand the world and make informed decisions. Your access to critical information, democratized.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Sections</h4>
                <div className="space-y-2 text-sm">
                  <Link to={createPageUrl("Category") + "?name=News"} className="block text-[var(--muted-foreground)] hover:text-[var(--foreground)]">News</Link>
                  <Link to={createPageUrl("Category") + "?name=Opinion"} className="block text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Opinion</Link>
                  <Link to={createPageUrl("Category") + "?name=Culture"} className="block text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Culture</Link>
                  <Link to={createPageUrl("Category") + "?name=Sport"} className="block text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Sport</Link>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">About</h4>
                <div className="space-y-2 text-sm">
                  <Link to={createPageUrl("About")} className="block text-[var(--muted-foreground)] hover:text-[var(--foreground)]">About Us</Link>
                  <Link to={createPageUrl("PublisherDashboard")} className="block text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Become a Publisher</Link>
                  <a href="#" className="block text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Advertise</a>
                  <a href={createPageUrl("About") + "#contact-section"} className="block text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Contact</a>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Stay Updated</h4>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  Get the latest stories delivered to your inbox.
                </p>
                <Link to={createPageUrl("DailyDigest")}>
                  <Button variant="default" size="sm" className="w-full select-none">
                    Subscribe to Digest
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-[var(--border)] text-center text-sm text-[var(--muted-foreground)]">
              <p className="mb-2">© {new Date().getFullYear()} Daily Horizons. All rights reserved.</p>
              <p>
                Developed by{' '}
                <a 
                  href="https://cereustechnologies.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline font-medium"
                >
                  Cereus Technologies
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}