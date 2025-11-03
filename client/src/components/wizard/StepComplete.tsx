import { useState } from "react";
import { useLocation } from "wouter";
import { Check, Copy, Code, ExternalLink, Home, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface IndexingStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    totalUrls: number;
    processedUrls: number;
    currentUrl?: string;
  };
  error?: string;
}

interface StepCompleteProps {
  chatbotId: string;
  indexingStatus?: IndexingStatus | null;
}

export function StepComplete({ chatbotId, indexingStatus }: StepCompleteProps) {
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

  const isIndexingInProgress = indexingStatus && (indexingStatus.status === 'pending' || indexingStatus.status === 'processing');
  const isIndexingComplete = indexingStatus && indexingStatus.status === 'completed';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            {isIndexingInProgress ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <Check className="w-10 h-10 text-primary" />
            )}
          </div>
          <h1 className="text-4xl font-bold">Chatbot Created Successfully!</h1>
          
          {isIndexingInProgress ? (
            <div className="space-y-3">
              <p className="text-xl text-muted-foreground">
                Your chatbot is being prepared...
              </p>
              <p className="text-base text-muted-foreground">
                We're crawling your website and processing the content. This typically takes <strong>20-30 minutes</strong> depending on the size of your website.
              </p>
            </div>
          ) : isIndexingComplete ? (
            <p className="text-xl text-muted-foreground">
              Your AI assistant is fully ready and can be deployed on your website
            </p>
          ) : (
            <p className="text-xl text-muted-foreground">
              Your AI assistant is ready to deploy on your website
            </p>
          )}
        </div>

        {/* Indexing Status Banner */}
        {isIndexingInProgress && (
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    Indexing Knowledge Sources
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {indexingStatus.progress.processedUrls} of {indexingStatus.progress.totalUrls} URLs processed
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    You can embed the chatbot now, but it will have limited knowledge until indexing completes. Monitor progress on your dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isIndexingComplete && (
          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Indexing Complete!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your chatbot's knowledge base is fully ready with all content indexed and AI-generated suggested questions available
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {indexingStatus && indexingStatus.status === 'failed' && (
          <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 dark:text-red-100">
                    Some URLs failed to index
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {indexingStatus.error || "Some URLs couldn't be indexed. Your chatbot will still work with available content."}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    You can update your chatbot's knowledge base later from the dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
