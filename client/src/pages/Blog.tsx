import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Clock, ArrowRight } from "lucide-react";
import type { BlogPost } from "@shared/schema";

export default function Blog() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts"],
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Blog - AI Chatbot Insights & Best Practices | BuildMyChatbot.Ai"
        description="Learn how to maximize your AI chatbot's effectiveness. Expert insights on customer service automation, chatbot strategies, and AI support best practices."
        keywords="AI chatbot blog, customer service automation, chatbot best practices, AI support tips, chatbot strategy"
        ogImage="https://buildmychatbot.ai/og-image.png"
        ogType="website"
      />
      
      {/* Header Navigation */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <nav className="flex items-center gap-4">
              <Link href="/pricing">
                <Button variant="ghost" data-testid="link-pricing">
                  Pricing
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" data-testid="link-home">
                  Home
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="default"
                  data-testid="button-login-header"
                >
                  Sign In
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <Badge className="mb-4" data-testid="badge-blog">
            Blog
          </Badge>
          <h1 className="text-5xl font-bold mb-4">
            AI Chatbot Insights & Best Practices
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Expert strategies for building smarter customer support with AI chatbots
          </p>
        </div>

        {/* Blog Posts Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="h-full hover-elevate active-elevate-2 cursor-pointer transition-all" data-testid={`card-blog-${post.slug}`}>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Clock className="w-4 h-4" />
                      <span>{post.readTimeMinutes} min read</span>
                      <span>•</span>
                      <time dateTime={post.publishedAt.toString()}>
                        {new Date(post.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </time>
                    </div>
                    <CardTitle className="text-2xl mb-2 line-clamp-2">{post.title}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      By {post.author}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <Button variant="ghost" size="sm" className="gap-2 p-0 h-auto" data-testid={`button-read-${post.slug}`}>
                      Read Article
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">No blog posts yet. Check back soon!</p>
          </div>
        )}

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto mt-20">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-12 text-center space-y-6">
              <h2 className="text-3xl font-bold">Ready to Build Your AI Chatbot?</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Put these insights into action. Start building your chatbot in 5 minutes.
              </p>
              <Button
                size="lg"
                className="text-lg px-8 py-6 h-auto"
                onClick={() => window.location.href = "/register"}
                data-testid="button-get-started-blog"
              >
                Start Free Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
