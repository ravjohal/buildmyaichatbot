import { Button } from "@/components/ui/button";
import { Bot, MessageSquare, Sparkles, Zap, DollarSign, Check, Clock, TrendingUp, Users, Shield, ArrowRight, Star } from "lucide-react";
import { Link } from "wouter";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { PRICING_PLANS } from "../../../shared/pricing";
import { SEO } from "@/components/SEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";

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
        title="AI Chatbot Builder | Create Custom Support Bots in Minutes - BuildMyChatbot.Ai"
        description="Build AI-powered customer support chatbots for your website without coding. Train on your content, customize appearance, capture leads, and deploy instantly. Start free today!"
        keywords="AI chatbot builder, customer support automation, chatbot software, AI customer service, website chatbot, no-code chatbot, chatbot platform, live chat alternative"
        structuredData={structuredData}
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
              Stop Making Customers Search.
              <span className="block text-primary mt-2">Let Them Ask.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Our AI chatbot trains on your website, documents, or knowledge base to give 
              <span className="font-semibold text-foreground"> instant, accurate answers 24/7</span>. 
              No coding. No headaches. Just happier customers.
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
            <h2 className="text-4xl font-bold mb-4">The Problem With Traditional Support</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your customers shouldn't have to wait, search through FAQs, or repeat themselves. They deserve better.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Pain Points */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-destructive mb-6">Without AI Support:</h3>
              <Card className="border-destructive/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Customers leave frustrated</div>
                      <div className="text-sm text-muted-foreground">Lost sales when they can't find answers fast</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Support tickets pile up</div>
                      <div className="text-sm text-muted-foreground">Your team drowns in repetitive questions</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">After-hours = lost business</div>
                      <div className="text-sm text-muted-foreground">No one there when customers need help most</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Scaling costs skyrocket</div>
                      <div className="text-sm text-muted-foreground">More customers = more support staff needed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Solutions */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-primary mb-6">With BuildMyChatbot.Ai:</h3>
              <Card className="border-primary/30">
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-3">
                    <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Customers get instant answers</div>
                      <div className="text-sm text-muted-foreground">Higher satisfaction, more conversions</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">70% fewer support tickets</div>
                      <div className="text-sm text-muted-foreground">AI handles common questions automatically</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">24/7 availability</div>
                      <div className="text-sm text-muted-foreground">Never miss a lead, even at 3am</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="font-semibold mb-1">Scale without hiring</div>
                      <div className="text-sm text-muted-foreground">Handle 10x more customers at the same cost</div>
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
            <h2 className="text-4xl font-bold mb-4">Get Your AI Chatbot in 3 Simple Steps</h2>
            <p className="text-xl text-muted-foreground">
              No technical skills required. Seriously.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4 p-6 rounded-lg border bg-card relative">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold">Train Your Bot</h3>
              <p className="text-muted-foreground">
                Add your website URL or upload documents. Our AI reads everything and learns your business in seconds.
              </p>
            </div>

            <div className="space-y-4 p-6 rounded-lg border bg-card relative">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold">Customize Your Brand</h3>
              <p className="text-muted-foreground">
                Match your colors, add your logo, set the personality. Make it feel like your brand in minutes.
              </p>
            </div>

            <div className="space-y-4 p-6 rounded-lg border bg-card relative">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold">Deploy Instantly</h3>
              <p className="text-muted-foreground">
                Copy one line of code. Paste it on your site. Your AI assistant is now live and helping customers.
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
              Start Building Your Chatbot Now
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
