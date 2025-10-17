import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageCircle, X, Send, Bot, Phone } from "lucide-react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Chatbot, ChatMessage } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function ChatWidget() {
  const [, params] = useRoute("/widget/:id");
  const chatbotId = params?.id || "";
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sessionId] = useState(() => `widget-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const { data: chatbot, isLoading } = useQuery<Chatbot>({
    queryKey: [`/api/chatbots/${chatbotId}`],
    enabled: !!chatbotId,
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest(
        "POST",
        "/api/chat",
        {
          chatbotId,
          message,
          conversationHistory: messages,
          sessionId,
        }
      );
      const data = await response.json() as { message: string; shouldEscalate: boolean; suggestedQuestions?: string[] };
      return data;
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.message,
        timestamp: Date.now(),
        suggestedQuestions: data.suggestedQuestions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && chatbot && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content: chatbot.welcomeMessage,
        timestamp: Date.now(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, chatbot, messages.length]);

  // Make the widget page transparent when loaded in iframe
  useEffect(() => {
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    
    // Notify parent window about widget state for pointer events
    const notifyParent = (type: string) => {
      window.parent.postMessage({ type }, '*');
    };

    if (isOpen) {
      notifyParent('chatbot-widget-open');
    } else {
      notifyParent('chatbot-widget-close');
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!inputValue.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(inputValue.trim());
    setInputValue("");
  };

  const handleSuggestedQuestion = (question: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(question);
  };

  if (isLoading || !chatbot) {
    return null;
  }

  // Show static suggested questions after welcome message, or AI-generated ones after any assistant message
  const getDisplayedSuggestions = () => {
    if (messages.length === 1 && chatbot.suggestedQuestions && chatbot.suggestedQuestions.length > 0) {
      return chatbot.suggestedQuestions;
    }
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.suggestedQuestions && lastMessage.suggestedQuestions.length > 0) {
      return lastMessage.suggestedQuestions;
    }
    return null;
  };

  const displayedSuggestions = getDisplayedSuggestions();

  return (
    <div className="fixed bottom-6 right-6 z-50" data-testid="chat-widget">
      {isOpen && (
        <div
          className="w-[400px] h-[600px] bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden border mb-4 animate-in slide-in-from-bottom-4"
          data-testid="chat-window"
        >
          <div
            className="p-4 text-white flex items-center justify-between gap-3"
            style={{ backgroundColor: chatbot.primaryColor }}
          >
            <div className="flex items-center gap-3">
              {chatbot.logoUrl ? (
                <img
                  src={chatbot.logoUrl}
                  alt={chatbot.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">{chatbot.name}</h3>
                <p className="text-xs opacity-90">Online</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-chat"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: chatbot.primaryColor + "20" }}
                    >
                      <Bot className="w-5 h-5" style={{ color: chatbot.primaryColor }} />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl p-3 max-w-[80%] ${
                      message.role === "user"
                        ? "text-white rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    }`}
                    style={
                      message.role === "user"
                        ? { backgroundColor: chatbot.accentColor }
                        : undefined
                    }
                  >
                    <p className="text-sm whitespace-pre-wrap" data-testid={`message-${message.id}`}>
                      {message.content || ""}
                    </p>
                    {message.content && chatbot.supportPhoneNumber && 
                      message.content.includes(chatbot.supportPhoneNumber) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => window.open(`tel:${chatbot.supportPhoneNumber}`)}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call {chatbot.supportPhoneNumber}
                        </Button>
                      )}
                  </div>
                </div>
              ))}

              {displayedSuggestions && !chatMutation.isPending && (
                <div className="flex flex-wrap gap-2 ml-11">
                  {displayedSuggestions.map((question, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover-elevate"
                      style={{ borderColor: chatbot.accentColor + "40" }}
                      onClick={() => handleSuggestedQuestion(question)}
                      data-testid={`suggested-question-${i}`}
                    >
                      {question}
                    </Badge>
                  ))}
                </div>
              )}

              {chatMutation.isPending && (
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: chatbot.primaryColor + "20" }}
                  >
                    <Bot className="w-5 h-5" style={{ color: chatbot.primaryColor }} />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                className="flex-1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                style={{ backgroundColor: chatbot.accentColor }}
                className="text-white"
                onClick={handleSend}
                disabled={!inputValue.trim() || chatMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-110 active-elevate-2"
        style={{ backgroundColor: chatbot.primaryColor }}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-chat-toggle"
      >
        {isOpen ? <X className="w-8 h-8" /> : <MessageCircle className="w-8 h-8" />}
      </button>
    </div>
  );
}
