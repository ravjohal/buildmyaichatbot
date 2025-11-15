import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Clock, ArrowLeft, ArrowRight } from "lucide-react";
import type { BlogPost } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function BlogPostPage() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug;

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: [`/api/blog/posts/${slug}`],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Logo size="sm" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
          <p className="text-xl text-muted-foreground mb-8">
            The blog post you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/blog">
            <Button data-testid="button-back-to-blog">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${post.title} | BuildMyChatbot.Ai Blog`}
        description={post.metaDescription || post.excerpt}
        keywords={post.metaKeywords || "AI chatbot, customer service, automation"}
      />
      
      {/* Header Navigation */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="sm" />
            <nav className="flex items-center gap-4">
              <Link href="/blog">
                <Button variant="ghost" data-testid="link-blog">
                  Blog
                </Button>
              </Link>
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

      <article className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/blog">
            <Button variant="ghost" className="mb-8" data-testid="button-back-to-blog">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Blog
            </Button>
          </Link>

          {/* Article Header */}
          <header className="mb-12">
            <h1 className="text-5xl font-bold mb-6" data-testid="blog-post-title">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{post.author}</span>
              </div>
              <span>•</span>
              <time dateTime={post.publishedAt.toString()}>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </time>
              <span>•</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.readTimeMinutes} min read</span>
              </div>
            </div>

            {post.excerpt && (
              <p className="text-xl text-muted-foreground mt-6 leading-relaxed">
                {post.excerpt}
              </p>
            )}
          </header>

          {/* Article Content */}
          <div 
            className="prose prose-lg max-w-none dark:prose-invert
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
              prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
              prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-6
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-strong:font-semibold
              prose-ul:my-6 prose-li:my-2
              prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:my-6
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none"
            data-testid="blog-post-content"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Article Footer CTA */}
          <div className="mt-16 pt-12 border-t">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Customer Support?</h3>
                <p className="text-muted-foreground mb-6">
                  Build your AI chatbot in minutes. No coding required. Start free today.
                </p>
                <div className="flex gap-4">
                  <Button
                    size="lg"
                    onClick={() => window.location.href = "/register"}
                    data-testid="button-get-started-post"
                  >
                    Start Free Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" data-testid="button-view-pricing-post">
                      View Pricing
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Back to Blog */}
          <div className="mt-12 text-center">
            <Link href="/blog">
              <Button variant="ghost" data-testid="button-more-articles">
                <ArrowLeft className="mr-2 w-4 h-4" />
                More Articles
              </Button>
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
}
