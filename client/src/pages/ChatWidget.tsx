import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageCircle, X, Send, Bot, Phone, UserPlus, Mail as MailIcon, Building2, Star } from "lucide-react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Chatbot, ChatMessage } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function ChatWidget() {
  console.log('[ChatWidget] Function called');
  const [, widgetParams] = useRoute("/widget/:id");
  const [, chatParams] = useRoute("/chat/:id");
  const params = widgetParams || chatParams;
  const chatbotId = params?.id || "";
  console.log('[ChatWidget] Params:', params);
  console.log('[ChatWidget] Chatbot ID from route:', chatbotId);
  
  // Check if we're in an iframe (embedded) or standalone page (shareable link)
  const isStandalone = window.self === window.top;
  
  const [isOpen, setIsOpen] = useState(isStandalone); // Auto-open for standalone
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sessionId] = useState(() => `widget-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  
  // Lead capture state
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadFormSkipped, setLeadFormSkipped] = useState(false);
  const [leadFormData, setLeadFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  // Rating state
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Proactive popup state
  const [showProactivePopup, setShowProactivePopup] = useState(false);
  const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: chatbot, isLoading, error } = useQuery<Chatbot>({
    queryKey: [`/api/public/chatbots/${chatbotId}`],
    enabled: !!chatbotId,
  });
  
  console.log('[ChatWidget] isLoading:', isLoading);
  console.log('[ChatWidget] chatbot:', chatbot);
  console.log('[ChatWidget] error:', error);
  console.log('[ChatWidget] isStandalone:', isStandalone);

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
      const data = await response.json() as { 
        message: string; 
        shouldEscalate: boolean; 
        suggestedQuestions?: string[];
        conversationId?: string;
      };
      return data;
    },
    onSuccess: (data) => {
      // Store conversation ID from first response
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
      
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

  const leadMutation = useMutation({
    mutationFn: async (formData: typeof leadFormData) => {
      const response = await apiRequest("POST", "/api/leads", {
        chatbotId,
        sessionId,
        ...formData,
      });
      return response.json();
    },
    onSuccess: () => {
      setLeadCaptured(true);
      setShowLeadForm(false);
      setLeadFormSkipped(false);
    },
  });

  const ratingMutation = useMutation({
    mutationFn: async ({ rating, conversationId }: { rating: number; conversationId: string }) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/rating`, { rating: rating.toString() });
      return response.json();
    },
    onSuccess: () => {
      setHasRated(true);
      setShowRating(false);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Determine when to show lead capture form
  useEffect(() => {
    if (!chatbot || leadCaptured || leadFormSkipped || showLeadForm || chatbot.leadCaptureEnabled !== "true") {
      return;
    }

    const userMessages = messages.filter(m => m.role === "user");
    
    switch (chatbot.leadCaptureTiming) {
      case "immediately":
        if (isOpen && messages.length === 1) {
          setShowLeadForm(true);
        }
        break;
      case "after_first_message":
        if (userMessages.length === 1) {
          setShowLeadForm(true);
        }
        break;
      case "after_n_messages":
        const targetCount = parseInt(chatbot.leadCaptureMessageCount || "1");
        if (userMessages.length === targetCount) {
          setShowLeadForm(true);
        }
        break;
      case "manual":
        // Don't auto-show, only manual trigger
        break;
    }
  }, [messages, chatbot, leadCaptured, leadFormSkipped, showLeadForm, isOpen]);

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

  // Make the widget page transparent when loaded in iframe, but not for standalone page
  useEffect(() => {
    console.log('[ChatWidget] Component mounted');
    console.log('[ChatWidget] Chatbot ID:', chatbotId);
    console.log('[ChatWidget] Is in iframe?', window.self !== window.top);
    
    if (!isStandalone) {
      // Only make transparent when embedded in iframe
      document.body.style.background = 'transparent';
      document.documentElement.style.background = 'transparent';
    } else {
      // For standalone page, use normal background
      document.body.style.background = '';
      document.documentElement.style.background = '';
    }
  }, [isStandalone]);

  // Proactive chat popup
  useEffect(() => {
    if (!chatbot || isStandalone || chatbot.proactiveChatEnabled !== "true") {
      return;
    }

    const delay = parseInt(chatbot.proactiveChatDelay || "5") * 1000;
    
    proactiveTimerRef.current = setTimeout(() => {
      if (!isOpen) {
        setShowProactivePopup(true);
      }
    }, delay);

    return () => {
      if (proactiveTimerRef.current) {
        clearTimeout(proactiveTimerRef.current);
      }
    };
  }, [chatbot, isOpen, isStandalone]);

  // Show rating after conversation
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length >= 3 && !hasRated && !showRating && conversationId) {
      setShowRating(true);
    }
  }, [messages, hasRated, showRating, conversationId]);

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

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fields = chatbot?.leadCaptureFields || [];
    
    // Detect source based on URL path
    let source = "unknown";
    let sourceUrl = window.location.href;
    
    if (window.location.pathname.includes("/widget/")) {
      source = "widget";
      // For widget (iframe), use the referrer URL (parent page)
      sourceUrl = document.referrer || window.location.href;
    } else if (window.location.pathname.includes("/chat/")) {
      source = "direct_link";
    } else if (window.location.pathname.includes("/test/")) {
      source = "test";
    }
    
    const submissionData: any = { 
      chatbotId, 
      sessionId,
      conversationId,
      source,
      sourceUrl
    };
    
    fields.forEach((field) => {
      if (leadFormData[field as keyof typeof leadFormData]) {
        submissionData[field] = leadFormData[field as keyof typeof leadFormData];
      }
    });
    
    leadMutation.mutate(submissionData);
  };

  const renderLeadForm = () => {
    if (!showLeadForm || !chatbot) return null;

    const fields = chatbot.leadCaptureFields || [];

    return (
      <div className="p-4 border-t border-b bg-muted/30" data-testid="lead-capture-form">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <UserPlus className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: chatbot.primaryColor }} />
            <div>
              <h3 className="font-semibold">{chatbot.leadCaptureTitle || "Get in Touch"}</h3>
              <p className="text-sm text-muted-foreground">
                {chatbot.leadCaptureMessage || "Leave your contact information and we'll get back to you."}
              </p>
            </div>
          </div>

          <form onSubmit={handleLeadSubmit} className="space-y-3">
            {fields.includes("name") && (
              <div className="space-y-1">
                <Label htmlFor="lead-name" className="text-xs">Name</Label>
                <Input
                  id="lead-name"
                  placeholder="Your name"
                  value={leadFormData.name}
                  onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                  required
                  className="h-9"
                  data-testid="input-lead-name"
                />
              </div>
            )}

            {fields.includes("email") && (
              <div className="space-y-1">
                <Label htmlFor="lead-email" className="text-xs">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="your@email.com"
                  value={leadFormData.email}
                  onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                  required
                  className="h-9"
                  data-testid="input-lead-email"
                />
              </div>
            )}

            {fields.includes("phone") && (
              <div className="space-y-1">
                <Label htmlFor="lead-phone" className="text-xs">Phone</Label>
                <Input
                  id="lead-phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={leadFormData.phone}
                  onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                  className="h-9"
                  data-testid="input-lead-phone"
                />
              </div>
            )}

            {fields.includes("company") && (
              <div className="space-y-1">
                <Label htmlFor="lead-company" className="text-xs">Company</Label>
                <Input
                  id="lead-company"
                  placeholder="Your company"
                  value={leadFormData.company}
                  onChange={(e) => setLeadFormData({ ...leadFormData, company: e.target.value })}
                  className="h-9"
                  data-testid="input-lead-company"
                />
              </div>
            )}

            {fields.includes("message") && (
              <div className="space-y-1">
                <Label htmlFor="lead-message" className="text-xs">Message</Label>
                <Textarea
                  id="lead-message"
                  placeholder="How can we help?"
                  value={leadFormData.message}
                  onChange={(e) => setLeadFormData({ ...leadFormData, message: e.target.value })}
                  rows={2}
                  data-testid="input-lead-message"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                style={{ backgroundColor: chatbot.accentColor }}
                disabled={leadMutation.isPending}
                data-testid="button-submit-lead"
              >
                {leadMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowLeadForm(false);
                  setLeadFormSkipped(true);
                }}
                data-testid="button-skip-lead"
              >
                Skip
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
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

  // Render full-page chat for standalone mode
  if (isStandalone) {
    return (
      <div className="h-screen w-full flex flex-col bg-background" data-testid="chat-widget">
        <div
          className="p-6 text-white flex items-center gap-3 border-b"
          style={{ backgroundColor: chatbot.primaryColor }}
        >
          {chatbot.logoUrl ? (
            <img
              src={chatbot.logoUrl}
              alt={chatbot.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              <Bot className="w-8 h-8" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold">{chatbot.name}</h1>
            <p className="text-sm opacity-90">Online - Ready to help</p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: chatbot.primaryColor + "20" }}
                  >
                    <Bot className="w-6 h-6" style={{ color: chatbot.primaryColor }} />
                  </div>
                )}
                <div
                  className={`rounded-2xl p-4 max-w-[70%] ${
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
              <div className="flex flex-wrap gap-2 ml-13">
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
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: chatbot.primaryColor + "20" }}
                >
                  <Bot className="w-6 h-6" style={{ color: chatbot.primaryColor }} />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm p-4">
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

        {renderLeadForm()}

        {showRating && !hasRated && (
          <div className="p-4 border-t bg-muted/30">
            <p className="text-sm font-medium mb-2">How was your experience?</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => {
                    setRating(star);
                    if (conversationId) {
                      ratingMutation.mutate({ rating: star, conversationId });
                    }
                  }}
                  data-testid={`button-rate-${star}`}
                >
                  <Star className={`w-6 h-6 ${star <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 border-t bg-background">
          <div className="max-w-3xl mx-auto">
            {chatbot.leadCaptureEnabled === "true" && !leadCaptured && !showLeadForm && (
              <div className="mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setShowLeadForm(true);
                    setLeadFormSkipped(false);
                  }}
                  data-testid="button-open-lead-form"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Leave Your Contact Details
                </Button>
              </div>
            )}
            <div className="flex gap-3">
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
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render floating widget for iframe embedding
  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-auto" data-testid="chat-widget">
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

          {renderLeadForm()}

          {showRating && !hasRated && (
            <div className="p-3 border-t bg-muted/30">
              <p className="text-xs font-medium mb-2">How was your experience?</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-auto"
                    onClick={() => {
                      setRating(star);
                      if (conversationId) {
                        ratingMutation.mutate({ rating: star, conversationId });
                      }
                    }}
                    data-testid={`button-rate-${star}`}
                  >
                    <Star className={`w-5 h-5 ${star <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-t">
            {chatbot.leadCaptureEnabled === "true" && !leadCaptured && !showLeadForm && (
              <div className="mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setShowLeadForm(true);
                    setLeadFormSkipped(false);
                  }}
                  data-testid="button-open-lead-form"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Leave Your Contact Details
                </Button>
              </div>
            )}
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

      {showProactivePopup && !isOpen && (
        <div className="absolute bottom-20 right-0 bg-card border rounded-lg shadow-lg p-3 max-w-xs animate-in slide-in-from-bottom-5 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-5 w-5"
            onClick={() => setShowProactivePopup(false)}
            data-testid="button-close-proactive"
          >
            <X className="w-3 h-3" />
          </Button>
          <p className="text-xs pr-5">{chatbot?.proactiveChatMessage || "Hi! Need any help?"}</p>
          <Button
            size="sm"
            className="mt-2 w-full h-7 text-xs"
            onClick={() => {
              setShowProactivePopup(false);
              setIsOpen(true);
            }}
            data-testid="button-start-proactive-chat"
          >
            Start Chat
          </Button>
        </div>
      )}

      <button
        className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-110 active-elevate-2"
        style={{ backgroundColor: chatbot.primaryColor }}
        onClick={(e) => {
          console.log('[ChatWidget] Chat button CLICKED!', e);
          console.log('[ChatWidget] Current isOpen state:', isOpen);
          console.log('[ChatWidget] Will toggle to:', !isOpen);
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => console.log('[ChatWidget] Mouse entered chat button')}
        onMouseDown={() => console.log('[ChatWidget] Mouse down on chat button')}
        onMouseUp={() => console.log('[ChatWidget] Mouse up on chat button')}
        data-testid="button-chat-toggle"
      >
        {isOpen ? <X className="w-8 h-8" /> : <MessageCircle className="w-8 h-8" />}
      </button>
    </div>
  );
}
