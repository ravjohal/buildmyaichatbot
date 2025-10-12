import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TestWidget() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const chatbotId = params.get("chatbotId");

  useEffect(() => {
    if (!chatbotId) {
      navigate("/");
      return;
    }

    const script = document.createElement("script");
    script.src = `/widget.js`;
    script.setAttribute("data-chatbot-id", chatbotId);
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [chatbotId, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-back-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Test Your Chatbot Widget</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            This is a test environment where you can interact with your chatbot widget.
            The floating button should appear in the bottom-right corner of your screen.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          <div className="bg-muted/30 rounded-lg p-8 text-center" data-testid="test-widget-content">
            <h2 className="text-xl font-semibold mb-3" data-testid="text-sample-content-title">Sample Content</h2>
            <p className="text-muted-foreground mb-4" data-testid="text-sample-content-description">
              Try asking the chatbot questions about the information you've provided in your knowledge base.
            </p>
            <div className="max-w-2xl mx-auto text-left space-y-4">
              <div className="bg-card p-4 rounded-lg">
                <h3 className="font-medium mb-2" data-testid="text-example-questions-title">Example Questions to Try:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground" data-testid="list-example-questions">
                  <li data-testid="text-example-question-1">• What are your business hours?</li>
                  <li data-testid="text-example-question-2">• How can I contact support?</li>
                  <li data-testid="text-example-question-3">• Tell me about your services</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
