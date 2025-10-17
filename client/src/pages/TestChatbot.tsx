import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Send, Bot } from "lucide-react";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Chatbot, ChatMessage } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function TestChatbot() {
  const [, params] = useRoute("/test/:id");
  const chatbotId = params?.id || "";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (chatbot && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content: chatbot.welcomeMessage,
        timestamp: Date.now(),
      };
      setMessages([welcomeMessage]);
    }
  }, [chatbot, messages.length]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading chatbot...</p>
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Chatbot not found</h2>
          <p className="text-muted-foreground mb-4">The chatbot you're looking for doesn't exist.</p>
          <Link href="/">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-background">
      <div className="border-b" style={{ backgroundColor: chatbot.primaryColor }}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  data-testid="button-back-dashboard"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              {chatbot.logoUrl ? (
                <img
                  src={chatbot.logoUrl}
                  alt={chatbot.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="text-white">
                <h1 className="text-xl font-semibold">{chatbot.name}</h1>
                <p className="text-sm opacity-90">Test Mode</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Testing
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto h-[calc(100vh-88px)] flex flex-col">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-4 max-w-3xl mx-auto">
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
                  className={`rounded-2xl p-4 max-w-[80%] ${
                    message.role === "user"
                      ? "text-white rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  }`}
                  style={
                    message.role === "user"
                      ? { backgroundColor: chatbot.accentColor }
                      : undefined
                  }
                  data-testid={`message-${message.id}`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content || ""}
                  </p>
                  {message.content && chatbot.supportPhoneNumber && 
                    message.content.includes(chatbot.supportPhoneNumber) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => window.open(`tel:${chatbot.supportPhoneNumber}`)}
                        data-testid="button-call-support"
                      >
                        <Bot className="w-4 h-4 mr-2" />
                        Call {chatbot.supportPhoneNumber}
                      </Button>
                    )}
                </div>
              </div>
            ))}

            {displayedSuggestions && !chatMutation.isPending && (
              <div className="space-y-2 py-4">
                <p className="text-sm text-muted-foreground">Suggested questions:</p>
                <div className="flex flex-wrap gap-2">
                  {displayedSuggestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestedQuestion(question)}
                      className="text-left h-auto whitespace-normal"
                      data-testid={`button-suggested-${index}`}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {chatMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: chatbot.primaryColor + "20" }}
                >
                  <Bot className="w-5 h-5" style={{ color: chatbot.primaryColor }} />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <Input
                placeholder={chatbot.welcomeMessage || "Type your message..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={chatMutation.isPending}
                className="flex-1"
                data-testid="input-message"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || chatMutation.isPending}
                style={{ backgroundColor: chatbot.primaryColor }}
                className="text-white"
                data-testid="button-send"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
