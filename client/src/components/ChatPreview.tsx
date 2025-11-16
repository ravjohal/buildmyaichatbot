import { MessageCircle, X, Send, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatPreviewProps {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  chatbotName: string;
}

export function ChatPreview({
  primaryColor,
  accentColor,
  logoUrl,
  welcomeMessage,
  suggestedQuestions,
  chatbotName,
}: ChatPreviewProps) {
  return (
    <div className="relative">
      <div className="bg-muted/30 rounded-2xl p-6 min-h-[600px] flex items-end justify-end">
        <div
          className="w-full max-w-[400px] h-[600px] bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden border"
          data-testid="chat-preview"
        >
          <div
            className="p-4 text-white flex items-center justify-between gap-3"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={chatbotName} className="w-10 h-10 rounded-lg" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">{chatbotName}</h3>
                <p className="text-xs opacity-90">Online</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: primaryColor + "20" }}
                >
                  <Bot className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm p-3 max-w-[80%]">
                  <p className="text-sm">{welcomeMessage}</p>
                </div>
              </div>

              {suggestedQuestions && suggestedQuestions.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-11">
                  {suggestedQuestions.slice(0, 3).map((question, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover-elevate"
                      style={{ borderColor: accentColor + "40" }}
                    >
                      {question}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                className="flex-1"
                disabled
              />
              <Button
                size="icon"
                style={{ backgroundColor: accentColor }}
                className="text-white"
                disabled
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-2 text-center">
              <a
                href="https://buildmychatbot.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-powered-by-preview"
              >
                Powered by BuildMyChatbot.AI
              </a>
            </div>
          </div>
        </div>

        <button
          className="absolute bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-110"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageCircle className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}
