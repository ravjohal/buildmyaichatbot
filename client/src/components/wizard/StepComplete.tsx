import { useState } from "react";
import { useLocation } from "wouter";
import { Check, Copy, Code, ExternalLink, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StepCompleteProps {
  chatbotId: string;
}

export function StepComplete({ chatbotId }: StepCompleteProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const embedCode = `<script src="${window.location.origin}/widget.js" data-chatbot-id="${chatbotId}" async></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast({
      title: "Copied to clipboard!",
      description: "Paste this code into your website.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">Chatbot Created Successfully!</h1>
          <p className="text-xl text-muted-foreground">
            Your AI assistant is ready to deploy on your website
          </p>
        </div>

        <Card>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Embed Code
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  data-testid="button-copy-embed"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <code data-testid="text-embed-code">{embedCode}</code>
              </div>
            </div>

            <Tabs defaultValue="simple" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="simple">Simple Instructions</TabsTrigger>
                <TabsTrigger value="developer">Developer Guide</TabsTrigger>
              </TabsList>
              <TabsContent value="simple" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">How to Add to Your Website:</h4>
                  <ol className="space-y-3 text-sm">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                        1
                      </span>
                      <span>Copy the code snippet above by clicking the "Copy Code" button</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                        2
                      </span>
                      <span>
                        Paste it onto every page of your website right before the closing{" "}
                        <code className="bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> tag
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                        3
                      </span>
                      <div className="space-y-2">
                        <span>If you use WordPress, Squarespace, or similar platforms:</span>
                        <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                          <li>Look for "Custom Code" or "Footer Scripts" in your site settings</li>
                          <li>Paste the code there to add it site-wide</li>
                        </ul>
                      </div>
                    </li>
                  </ol>
                </div>
              </TabsContent>
              <TabsContent value="developer" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Technical Details:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        The script loads asynchronously and won't block your page rendering
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        Total widget size is ~50KB (gzipped), optimized for performance
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        Ensure your Content Security Policy (CSP) allows scripts from{" "}
                        <code className="bg-muted px-1 py-0.5 rounded">{window.location.origin}</code>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        The chatbot data is identified by the{" "}
                        <code className="bg-muted px-1 py-0.5 rounded">data-chatbot-id</code> attribute
                      </span>
                    </li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/")}
                data-testid="button-go-dashboard"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`/test/${chatbotId}`, "_blank")}
                data-testid="button-test-widget"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Test Widget
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
