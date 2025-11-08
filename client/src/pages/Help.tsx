import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Book, Search, Home, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DashboardHeader } from "@/components/DashboardHeader";

// Icon mapping for categories
const iconMap: Record<string, typeof Book> = {
  Rocket: Book,
  Bot: Book,
  Users: Book,
  Mail: Book,
  BarChart3: Book,
  CreditCard: Book,
};

interface Article {
  id: string;
  title: string;
  slug: string;
  description: string;
  file: string;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  articles: Article[];
}

interface DocsManifest {
  categories: Category[];
}

export default function Help() {
  const [, params] = useRoute("/help/:slug");
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Load manifest
  const { data: manifest, isLoading: manifestLoading } = useQuery<DocsManifest>({
    queryKey: ["/docs/manifest.json"],
    queryFn: async () => {
      const response = await fetch("/docs/manifest.json");
      if (!response.ok) throw new Error("Failed to load docs manifest");
      return response.json();
    },
  });

  // Load article content
  const { data: articleContent, isLoading: articleLoading } = useQuery({
    queryKey: ["/docs/article", selectedArticle?.file],
    queryFn: async () => {
      if (!selectedArticle?.file) return null;
      const response = await fetch(selectedArticle.file);
      if (!response.ok) throw new Error("Failed to load article");
      return response.text();
    },
    enabled: !!selectedArticle,
  });

  // Handle URL params to select article
  useEffect(() => {
    if (params?.slug && manifest) {
      // Find article by slug
      for (const category of manifest.categories) {
        const article = category.articles.find((a) => a.slug === params.slug);
        if (article) {
          setSelectedArticle(article);
          break;
        }
      }
    } else if (manifest && !selectedArticle) {
      // Default to first article
      setSelectedArticle(manifest.categories[0]?.articles[0]);
    }
  }, [params?.slug, manifest, selectedArticle]);

  // Filter articles by search query
  const filteredCategories = manifest?.categories.map((category) => ({
    ...category,
    articles: category.articles.filter(
      (article) =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.articles.length > 0);

  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
    setLocation(`/help/${article.slug}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-home">
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Help Center</span>
            {selectedArticle && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span>{selectedArticle.title}</span>
              </>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-2">Help Center</h1>
          <p className="text-muted-foreground">
            Step-by-step guides for all BuildMyChatbot.Ai features
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-docs"
          />
        </div>

        {manifestLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[300px_1fr] gap-8">
            {/* Sidebar */}
            <aside>
              <ScrollArea className="h-[calc(100vh-300px)]">
                <nav className="space-y-6">
                  {filteredCategories?.map((category) => {
                    const Icon = iconMap[category.icon] || Book;
                    return (
                      <div key={category.id}>
                        <div className="flex items-center gap-2 font-semibold mb-3">
                          <Icon className="h-5 w-5" />
                          {category.title}
                        </div>
                        <div className="space-y-1">
                          {category.articles.map((article) => (
                            <button
                              key={article.id}
                              onClick={() => handleArticleClick(article)}
                              className={`
                                w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                                ${
                                  selectedArticle?.id === article.id
                                    ? "bg-primary text-primary-foreground"
                                    : "hover-elevate text-muted-foreground hover:text-foreground"
                                }
                              `}
                              data-testid={`button-article-${article.slug}`}
                            >
                              {article.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {searchQuery && filteredCategories?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No articles found for "{searchQuery}"
                    </div>
                  )}
                </nav>
              </ScrollArea>
            </aside>

            {/* Article Content */}
            <main>
              <Card className="p-8">
                {articleLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : articleContent ? (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Customize link rendering to use wouter
                        a: ({ node, href, children, ...props }) => {
                          if (href?.startsWith("/help/")) {
                            return (
                              <Link href={href}>
                                <a className="text-primary hover:underline" {...props}>
                                  {children}
                                </a>
                              </Link>
                            );
                          }
                          return (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              {...props}
                            >
                              {children}
                            </a>
                          );
                        },
                        // Handle images with placeholder alt text
                        img: ({ node, alt, src, ...props }) => {
                          // If image not found, show placeholder
                          if (!src || src.startsWith("#")) {
                            return (
                              <div className="bg-muted rounded-lg p-8 text-center my-4 border-2 border-dashed">
                                <p className="text-sm text-muted-foreground">
                                  📸 Screenshot: {alt}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  (Coming soon)
                                </p>
                              </div>
                            );
                          }
                          return <img alt={alt} src={src} className="rounded-lg border" {...props} />;
                        },
                      }}
                    >
                      {articleContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Article Selected</h2>
                    <p className="text-muted-foreground">
                      Choose an article from the sidebar to get started
                    </p>
                  </div>
                )}
              </Card>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
