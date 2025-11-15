import { Button } from "@/components/ui/button";
import { Bot, MessageSquare, Sparkles, Zap, DollarSign, Check, Clock, TrendingUp, Users, Shield, ArrowRight, Star, FileText, ShoppingCart, Code, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { PRICING_PLANS } from "../../../shared/pricing";
import { SEO } from "@/components/SEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "BuildMyChatbot.Ai",
    "applicationCategory": "BusinessApplication",
    "description": "Create AI-powered customer support chatbots for your website. No coding required. Train on your content, customize design, and deploy in minutes with BuildMyChatbot.Ai",
    "operatingSystem": "Web browser",
    "url": "https://buildmychatbot.ai",
    "image": "https://buildmychatbot.ai/og-image.png",
    "offers": [
      {
        "@type": "Offer",
        "name": "Free Plan",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Perfect for trying out BuildMyChatbot.Ai",
        "priceValidUntil": "2026-12-31",
        "availability": "https://schema.org/InStock",
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": "0",
            "currency": "USD"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "businessDays": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            },
            "cutoffTime": "23:59:59",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 0,
              "maxValue": 0,
              "unitCode": "DAY"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 0,
              "maxValue": 0,
              "unitCode": "DAY"
            }
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "US"
          }
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "US",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 30,
          "returnMethod": "https://schema.org/ReturnByMail",
          "returnFees": "https://schema.org/FreeReturn"
        }
      },
      {
        "@type": "Offer",
        "name": "Starter Plan",
        "price": "24.99",
        "priceCurrency": "USD",
        "priceValidUntil": "2026-12-31",
        "availability": "https://schema.org/InStock",
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": "0",
            "currency": "USD"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "businessDays": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            },
            "cutoffTime": "23:59:59",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 0,
              "maxValue": 0,
              "unitCode": "DAY"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 0,
              "maxValue": 0,
              "unitCode": "DAY"
            }
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "US"
          }
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "US",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 30,
          "returnMethod": "https://schema.org/ReturnByMail",
          "returnFees": "https://schema.org/FreeReturn"
        },
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "24.99",
          "priceCurrency": "USD",
          "billingIncrement": 1,
          "billingPeriod": "P1M",
          "referenceQuantity": {
            "@type": "QuantitativeValue",
            "value": "1",
            "unitCode": "MON"
          }
        }
      },
      {
        "@type": "Offer",
        "name": "Business Plan",
        "price": "49",
        "priceCurrency": "USD",
        "priceValidUntil": "2026-12-31",
        "availability": "https://schema.org/InStock",
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": "0",
            "currency": "USD"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "businessDays": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            },
            "cutoffTime": "23:59:59",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 0,
              "maxValue": 0,
              "unitCode": "DAY"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 0,
              "maxValue": 0,
              "unitCode": "DAY"
            }
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "US"
          }
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "US",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 30,
          "returnMethod": "https://schema.org/ReturnByMail",
          "returnFees": "https://schema.org/FreeReturn"
        },
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "49",
          "priceCurrency": "USD",
          "billingIncrement": 1,
          "billingPeriod": "P1M",
          "referenceQuantity": {
            "@type": "QuantitativeValue",
            "value": "1",
            "unitCode": "MON"
          }
        }
      },
      {
        "@type": "Offer",
        "name": "Scale Plan",
        "price": "129",
        "priceCurrency": "USD",
        "priceValidUntil": "2026-12-31",
        "availability": "https://schema.org/InStock",
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": "0",
            "currency": "USD"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "businessDays": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            },
            "cutoffTime": "23:59:59",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 0,
              "maxValue": 0,
              "unitCode": "DAY"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 0,
              "maxValue": 0,
              "unitCode": "DAY"
            }
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "US"
          }
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "US",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 30,
          "returnMethod": "https://schema.org/ReturnByMail",
          "returnFees": "https://schema.org/FreeReturn"
        },
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "129",
          "priceCurrency": "USD",
          "billingIncrement": 1,
          "billingPeriod": "P1M",
          "referenceQuantity": {
            "@type": "QuantitativeValue",
            "value": "1",
            "unitCode": "MON"
          }
        }
      }
    ],
    "featureList": [
      "AI-powered chatbot builder",
      "Train on website content and documents",
      "Customizable design and branding",
      "One-click deployment",
      "Lead capture and CRM integration",
      "Live agent handoff",
      "Analytics and conversation tracking",
      "Multi-language support",
      "No coding required"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127"
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Replace Your Search Bar with Intelligent AI | BuildMyChatbot.Ai"
        description="Stop giving users link lists. Train an AI on your website that gives direct answers to questions. Intelligent search powered by AI—index your content in 5 minutes, deploy instantly. Start free!"
        keywords="intelligent search, AI search, website search replacement, conversational search, AI chatbot builder, RAG chatbot, natural language search, search optimization, answer engine"
        structuredData={structuredData}
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
              <Button
                variant="default"
                onClick={() => window.location.href = "/login"}
                data-testid="button-login-header"
              >
                Sign In
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Star className="w-4 h-4 fill-current" />
              Trusted by businesses worldwide
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              Replace Your Search Bar with an AI
              <span className="block text-primary mt-2">That Actually Answers Questions</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Your website has the answers. Your search bar just can't deliver them.
              <span className="font-semibold text-foreground"> Train an AI on your content in 5 minutes</span> and give users 
              direct answers, not homework assignments.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size="lg"
              className="text-lg px-8 py-6 h-auto"
              onClick={() => window.location.href = "/register"}
              data-testid="button-get-started"
            >
              Start Free in 5 Minutes
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto" data-testid="button-view-pricing">
                See Pricing
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t">
            <div className="space-y-1" data-testid="stat-availability">
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Always Available</div>
            </div>
            <div className="space-y-1" data-testid="stat-response-time">
              <div className="text-3xl font-bold text-primary">&lt;2s</div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </div>
            <div className="space-y-1" data-testid="stat-ticket-reduction">
              <div className="text-3xl font-bold text-primary">70%</div>
              <div className="text-sm text-muted-foreground">Fewer Support Tickets*</div>
            </div>
            <div className="space-y-1" data-testid="stat-free-start">
              <div className="text-3xl font-bold text-primary">$0</div>
              <div className="text-sm text-muted-foreground">To Get Started</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            * Industry average based on AI chatbot deployment case studies
          </p>

        </div>

        {/* Pain Points & Solutions Section */}
        <div className="max-w-6xl mx-auto mt-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Your Search Bar Is Failing Your Users</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              You have 500 pages of valuable content. Your users find 3 of them. Here's why traditional search doesn't work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Pain Points */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-destructive mb-6">The "Onus Boomerang":</h3>
              <Card className="border-destructive/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Returns lists, not answers</div>
                      <div className="text-sm text-muted-foreground">47 search results? That's not helping—that's homework</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Users click, scroll, give up, leave</div>
                      <div className="text-sm text-muted-foreground">High bounce rates because they can't find what they need</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Keyword-based, not intent-based</div>
                      <div className="text-sm text-muted-foreground">Can't tell "buy shoes" from "recycle shoes"</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Your content's value is hidden</div>
                      <div className="text-sm text-muted-foreground">Years of work users can't access</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Solutions */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-primary mb-6">Intelligent Search with AI:</h3>
              <Card className="border-primary/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-3">
                    <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Gives answers, not link lists</div>
                      <div className="text-sm text-muted-foreground">Direct responses users can actually use</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Understands natural language</div>
                      <div className="text-sm text-muted-foreground">Users ask questions like they're talking to an expert</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Finds specific data instantly</div>
                      <div className="text-sm text-muted-foreground">Searches your entire site in milliseconds</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Works 24/7, never sleeps</div>
                      <div className="text-sm text-muted-foreground">Instant expertise at any hour</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="max-w-6xl mx-auto mt-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Replace Your Search Bar in 3 Simple Steps</h2>
            <p className="text-xl text-muted-foreground">
              From traditional search to intelligent answers in under 10 minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4 p-6 rounded-lg border bg-card relative">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold">Index Your Content</h3>
              <p className="text-muted-foreground">
                Add your website URL or upload documents. Our AI reads everything—even complex SPAs—and builds a searchable knowledge base in seconds.
              </p>
            </div>

            <div className="space-y-4 p-6 rounded-lg border bg-card relative">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">Customize the Experience</h3>
              <p className="text-muted-foreground">
                Match your brand colors, set the AI's personality, and configure when to escalate to humans. No coding required.
              </p>
            </div>

            <div className="space-y-4 p-6 rounded-lg border bg-card relative">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold">Deploy Everywhere</h3>
              <p className="text-muted-foreground">
                Embed on your site with one line of code, share a direct link, or generate a QR code. Your intelligent search is now live.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button
              size="lg"
              className="text-lg px-8 py-6 h-auto"
              onClick={() => window.location.href = "/register"}
              data-testid="button-get-started-middle"
            >
              Start Building Your AI Search Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Use Cases by Industry Section */}
        <div className="max-w-6xl mx-auto mt-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Who Benefits from Intelligent Search?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From content publishers to e-commerce—any site with valuable content can turn it into an interactive expert.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Content Publishers */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Content Publishers</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">The Challenge:</span> Readers land on your site looking for specific information buried in hundreds of articles. They skim headlines, bounce after 30 seconds.
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">The Solution:</span> Let them ask "What were the top NFL draft picks in 2023?" and get instant answers with source links—keeping them engaged and on your site longer.
                </p>
                <div className="pt-2 flex items-center gap-2 text-sm text-primary">
                  <Check className="w-4 h-4" />
                  <span>Lower bounce rates, higher engagement</span>
                </div>
              </CardContent>
            </Card>

            {/* E-commerce */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">E-commerce</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">The Challenge:</span> Shoppers can't find the right product from your catalog. They search "waterproof hiking boots size 10" and get 200 results.
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">The Solution:</span> AI understands intent, narrows options instantly, and can even capture their email if they need to think it over—turning browsers into buyers.
                </p>
                <div className="pt-2 flex items-center gap-2 text-sm text-primary">
                  <Check className="w-4 h-4" />
                  <span>Faster product discovery, more conversions</span>
                </div>
              </CardContent>
            </Card>

            {/* SaaS / Documentation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Code className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">SaaS & Documentation</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">The Challenge:</span> Developers need answers from your API docs but your search returns page after page of endpoints. Support tickets pile up.
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">The Solution:</span> AI delivers precise code examples and explanations instantly, escalating to live support only when truly needed.
                </p>
                <div className="pt-2 flex items-center gap-2 text-sm text-primary">
                  <Check className="w-4 h-4" />
                  <span>70% fewer support tickets, happier developers</span>
                </div>
              </CardContent>
            </Card>

            {/* Knowledge Bases */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Knowledge Bases & Wikis</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">The Challenge:</span> Employees waste hours hunting through HR policies, company wikis, and internal docs for simple answers.
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">The Solution:</span> Ask "What's our remote work policy?" and get the exact section, cited and accurate—without reading 47 PDFs.
                </p>
                <div className="pt-2 flex items-center gap-2 text-sm text-primary">
                  <Check className="w-4 h-4" />
                  <span>Instant answers, massive time savings</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-muted-foreground mb-6">
              And that's just the beginning. Anywhere you have content, you can have an intelligent search experience.
            </p>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 h-auto"
              onClick={() => window.location.href = "/register"}
              data-testid="button-get-started-use-cases"
            >
              Try It Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about BuildMyChatbot.Ai
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">
                Do I need coding skills to create a chatbot?
              </AccordionTrigger>
              <AccordionContent>
                Absolutely not! BuildMyChatbot.Ai is designed for business owners, not developers. Our wizard guides you through every step, and you can have a chatbot live on your site in just 5 minutes by copying a single line of code.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                How does the AI learn about my business?
              </AccordionTrigger>
              <AccordionContent>
                Simply provide your website URL or upload documents (PDFs, Word files, etc.). Our AI automatically reads and understands your content, creating a knowledge base that lets your chatbot answer customer questions accurately based on YOUR information.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                Can I try it for free?
              </AccordionTrigger>
              <AccordionContent>
                Yes! Our Free plan gives you 1 chatbot with 3 total questions and 100 MB knowledge base forever. No credit card required. Start building and see how it works before upgrading.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                What if the chatbot doesn't know an answer?
              </AccordionTrigger>
              <AccordionContent>
                The chatbot can be configured to escalate to human support when it encounters questions it can't answer confidently. You can also enable lead capture forms and live agent handoff to ensure no customer inquiry goes unanswered.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                Can I customize how the chatbot looks and sounds?
              </AccordionTrigger>
              <AccordionContent>
                Absolutely! You control the colors, logo, welcome message, and even the chatbot's personality and tone. Make it formal, friendly, professional, or playful - whatever matches your brand. You can also add custom instructions to guide how the AI responds.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left">
                What happens if I exceed my plan limits?
              </AccordionTrigger>
              <AccordionContent>
                Your chatbot will continue working, but you'll be prompted to upgrade to keep full functionality. We'll never shut down your chatbot mid-conversation with a customer. You can upgrade anytime with a few clicks.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger className="text-left">
                Is there a money-back guarantee?
              </AccordionTrigger>
              <AccordionContent>
                Yes! We offer a 30-day money-back guarantee on all paid plans. If you're not satisfied, just contact us at support@buildmychatbot.ai for a full refund - no questions asked.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Pricing Preview Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-xl text-muted-foreground">
              Start free. Scale as you grow. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.tier}
                className={`p-6 rounded-lg border bg-card relative flex flex-col ${
                  plan.popular ? "border-2 border-primary" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">${plan.monthlyPrice}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  {plan.annualPrice > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      or ${plan.annualPrice}/year
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.slice(0, 6).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.tier === "free" ? "outline" : plan.popular ? "default" : "outline"}
                  className="w-full"
                  onClick={() => {
                    if (plan.tier === "free") {
                      window.location.href = "/register";
                    } else {
                      window.location.href = `/login?redirect=/subscribe?tier=${plan.tier}&plan=monthly`;
                    }
                  }}
                  data-testid={`button-plan-${plan.tier}`}
                >
                  {plan.tier === "free" ? "Get Started Free" : `Choose ${plan.name}`}
                </Button>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button variant="ghost" data-testid="link-full-pricing">
                View full pricing details →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-12 text-center space-y-6">
              <h2 className="text-4xl font-bold">Ready to Transform Your Customer Support?</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join hundreds of businesses using AI to provide instant, 24/7 support. 
                Start free in 5 minutes. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 h-auto"
                  onClick={() => window.location.href = "/register"}
                  data-testid="button-get-started-bottom"
                >
                  Start Free Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 h-auto"
                  onClick={() => window.location.href = "/login"}
                  data-testid="button-sign-in-bottom"
                >
                  Sign In
                </Button>
              </div>
              <p className="text-sm text-muted-foreground pt-4">
                ✓ No credit card required  ✓ 5-minute setup  ✓ Cancel anytime
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
