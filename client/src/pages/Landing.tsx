import { Button } from "@/components/ui/button";
import { Bot, MessageSquare, Sparkles, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              AI-Powered Customer Support
              <span className="block text-primary mt-2">Made Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create intelligent chatbots for your website in minutes. Train on your content,
              customize the design, and deploy with a single line of code.
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-login"
            >
              Get Started
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="space-y-3 p-6 rounded-lg border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">AI-Powered Responses</h3>
              <p className="text-sm text-muted-foreground">
                Powered by Google Gemini AI to provide intelligent, context-aware answers to your customers.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-lg border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Easy Customization</h3>
              <p className="text-sm text-muted-foreground">
                Customize colors, upload your logo, and configure personality to match your brand perfectly.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-lg border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">One-Click Deploy</h3>
              <p className="text-sm text-muted-foreground">
                Copy the embed code and add it to any website. Your chatbot will be live instantly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
