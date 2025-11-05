import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageCircle, X, Send, Bot, Phone, UserPlus, Mail as MailIcon, Building2, Star } from "lucide-react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublicChatbot, ChatMessage } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Utility function to convert URLs in text to clickable links
function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      let url = part;
      let trailing = '';
      
      // Strip trailing punctuation that's clearly not part of the URL
      // Be conservative: only strip periods, commas, semicolons, colons, exclamation marks, question marks
      // Keep parentheses, brackets, quotes if they might be part of the URL structure
      while (url.length > 0) {
        const lastChar = url[url.length - 1];
        
        // Always strip these characters (never part of URLs)
        if ('.,:;!?'.includes(lastChar)) {
          trailing = lastChar + trailing;
          url = url.slice(0, -1);
          continue;
        }
        
        // For closing brackets/parens: only strip if unbalanced (more closing than opening)
        if (lastChar === ')') {
          const openCount = (url.match(/\(/g) || []).length;
          const closeCount = (url.match(/\)/g) || []).length;
          if (closeCount > openCount) {
            trailing = lastChar + trailing;
            url = url.slice(0, -1);
            continue;
          }
        }
        
        if (lastChar === ']') {
          const openCount = (url.match(/\[/g) || []).length;
          const closeCount = (url.match(/\]/g) || []).length;
          if (closeCount > openCount) {
            trailing = lastChar + trailing;
            url = url.slice(0, -1);
            continue;
          }
        }
        
        if (lastChar === '}') {
          const openCount = (url.match(/\{/g) || []).length;
          const closeCount = (url.match(/\}/g) || []).length;
          if (closeCount > openCount) {
            trailing = lastChar + trailing;
            url = url.slice(0, -1);
            continue;
          }
        }
        
        // For quotes: strip if they appear at the end (likely wrapping)
        if (lastChar === '"' || lastChar === "'") {
          trailing = lastChar + trailing;
          url = url.slice(0, -1);
          continue;
        }
        
        // Nothing more to strip
        break;
      }
      
      return (
        <span key={index}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
            data-testid={`link-source-${index}`}
          >
            {url}
          </a>
          {trailing}
        </span>
      );
    }
    return part;
  });
}

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
  
  // Generate or retrieve sessionId with localStorage key
  const [sessionId] = useState(() => {
    const storageKey = `chatbot-session-${chatbotId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return stored;
    }
    const newSessionId = `widget-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(storageKey, newSessionId);
    return newSessionId;
  });
  
  // Load persisted state from localStorage
  const getStorageKey = (key: string) => `chatbot-${chatbotId}-${key}`;
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(getStorageKey('messages'));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Lead capture state
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(() => {
    try {
      const stored = localStorage.getItem(getStorageKey('leadCaptured'));
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [leadFormSkipped, setLeadFormSkipped] = useState(() => {
    try {
      const stored = localStorage.getItem(getStorageKey('leadFormSkipped'));
      return stored === 'true';
    } catch {
      return false;
    }
  });
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
  const [hasRated, setHasRated] = useState(() => {
    try {
      const stored = localStorage.getItem(getStorageKey('hasRated'));
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(getStorageKey('conversationId'));
      return stored || null;
    } catch {
      return null;
    }
  });
  
  // Proactive popup state
  const [showProactivePopup, setShowProactivePopup] = useState(false);
  const proactiveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Question rotation state - track current index for cycling through all 20 questions
  const [questionRotationIndex, setQuestionRotationIndex] = useState(() => {
    try {
      const stored = localStorage.getItem(getStorageKey('questionRotationIndex'));
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Fetch chatbot config which now includes AI-generated questions
  const { data: chatbot, isLoading, error } = useQuery<PublicChatbot>({
    queryKey: [`/api/public/chatbots/${chatbotId}`],
    enabled: !!chatbotId,
  });
  
  // Extract AI-generated questions from chatbot response (no separate API call needed!)
  const aiGeneratedQuestions = chatbot?.aiGeneratedQuestions || [];

  // Determine which suggested questions to display with rotation
  // Memoized to prevent recalculating on every render (especially during streaming)
  // MUST be declared before any conditional returns (React hooks rule)
  const displayedSuggestions = useMemo(() => {
    const calcStart = performance.now();
    
    if (!chatbot) return ["How do I connect with a human?"];
    
    const userMessages = messages.filter(m => m.role === "user");
    const hasUserInteracted = userMessages.length > 0;
    const HARDCODED_QUESTION = "How do I connect with a human?";

    // After user has interacted: show AI-generated questions if toggle is enabled
    if (hasUserInteracted) {
      if (chatbot?.enableSuggestedQuestions === "true" && aiGeneratedQuestions.length > 0) {
        const totalQuestions = aiGeneratedQuestions.length;
        
        // Rotate through all questions, showing 2 at a time
        // Use modulo to wrap around when we reach the end
        const questions = [];
        for (let i = 0; i < 2; i++) {
          const index = (questionRotationIndex + i) % totalQuestions;
          questions.push(aiGeneratedQuestions[index]);
        }
        
        const calcTime = performance.now() - calcStart;
        if (calcTime > 5) {
          console.log(`[PERF-WIDGET] displayedSuggestions calculation: ${calcTime.toFixed(2)}ms (AI questions)`);
        }
        return [...questions, HARDCODED_QUESTION];
      }
      // After interaction, still show the hardcoded question even if no AI questions
      return [HARDCODED_QUESTION];
    }

    // Initially (before user interaction): ALWAYS show welcome questions if available
    if (chatbot.suggestedQuestions && chatbot.suggestedQuestions.length > 0) {
      const welcomeQuestions = chatbot.suggestedQuestions.slice(0, 2);
      return [...welcomeQuestions, HARDCODED_QUESTION];
    }

    // If no welcome questions, just show the hardcoded question
    return [HARDCODED_QUESTION];
  }, [messages, chatbot, aiGeneratedQuestions, questionRotationIndex]);
  
  // Track when AI questions are loaded (now from initial chatbot fetch)
  useEffect(() => {
    if (aiGeneratedQuestions.length > 0) {
      console.log(`[PERF-WIDGET] AI questions available: ${aiGeneratedQuestions.length} questions (from chatbot fetch - no separate API call!)`);
    }
  }, [aiGeneratedQuestions]);
  
  console.log('[ChatWidget] isLoading:', isLoading);
  console.log('[ChatWidget] chatbot:', chatbot);
  console.log('[ChatWidget] error:', error);
  console.log('[ChatWidget] isStandalone:', isStandalone);
  console.log('[ChatWidget] aiGeneratedQuestions:', aiGeneratedQuestions.length);

  // State for streaming responses
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  
  // State for live agent handoff
  const [handoffStatus, setHandoffStatus] = useState<"none" | "requested" | "connected">("none");
  const [showHandoffButton, setShowHandoffButton] = useState(false);
  const [handoffWs, setHandoffWs] = useState<WebSocket | null>(null);
  
  // Streaming chat handler
  const handleStreamingChat = async (message: string) => {
    setIsStreaming(true);
    
    // Create a placeholder message for streaming
    const messageId = Date.now().toString();
    setStreamingMessageId(messageId);
    
    const placeholderMessage: ChatMessage = {
      id: messageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, placeholderMessage]);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatbotId,
          message,
          conversationHistory: messages,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to streaming API");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";
      let suggestions: string[] = [];
      let shouldEscalate = false;
      let receivedConversationId = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "chunk") {
                  // Streaming chunk - append to message
                  fullResponse += data.content;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === messageId
                        ? { ...msg, content: fullResponse }
                        : msg
                    )
                  );
                } else if (data.type === "complete") {
                  // Final message or cached response
                  if (data.message) {
                    fullResponse = data.message;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === messageId
                          ? { 
                              ...msg, 
                              content: fullResponse,
                              images: data.images,
                            }
                          : msg
                      )
                    );
                  } else if (data.images) {
                    // Only images, no message (update images)
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === messageId
                          ? { ...msg, images: data.images }
                          : msg
                      )
                    );
                  }
                  if (data.suggestedQuestions) {
                    suggestions = data.suggestedQuestions;
                  }
                  if (data.shouldEscalate !== undefined) {
                    shouldEscalate = data.shouldEscalate;
                  }
                } else if (data.type === "metadata") {
                  if (data.conversationId) {
                    receivedConversationId = data.conversationId;
                    if (!conversationId) {
                      setConversationId(data.conversationId);
                    }
                  }
                  if (data.shouldEscalate !== undefined) {
                    shouldEscalate = data.shouldEscalate;
                  }
                } else if (data.type === "error") {
                  // Error from server
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === messageId
                        ? { ...msg, content: data.message || "An error occurred" }
                        : msg
                    )
                  );
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      }

      // Update final message with suggestions
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, suggestedQuestions: suggestions }
            : msg
        )
      );

      // Show handoff button if escalation is needed
      if (shouldEscalate) {
        setShowHandoffButton(true);
      }

    } catch (error) {
      console.error("Streaming error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId
            ? { ...msg, content: "I apologize, but I encountered an error. Please try again." }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
    }
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      console.log('[PERF-WIDGET] Chat mutation started');
      const mutationStart = performance.now();
      await handleStreamingChat(message);
      const mutationTime = performance.now() - mutationStart;
      console.log(`[PERF-WIDGET] Chat mutation completed: ${mutationTime.toFixed(2)}ms`);
      return { success: true };
    },
    onSettled: () => {
      console.log('[PERF-WIDGET] Chat mutation settled (isPending should now be false)');
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

  const handoffMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/handoffs", {
        conversationId: conversationId || "",
        chatbotId,
        visitorName: leadFormData.name || null,
        visitorEmail: leadFormData.email || null,
      });
      return response.json();
    },
    onSuccess: () => {
      setHandoffStatus("requested");
      setShowHandoffButton(false);
    },
  });

  const handleRequestHandoff = () => {
    if (!conversationId) {
      console.error("Cannot request handoff without conversation ID");
      return;
    }
    handoffMutation.mutate();
  };

  // WebSocket connection for agent messages
  useEffect(() => {
    if (handoffStatus === "requested" && conversationId) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/live-chat`;
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        websocket.send(JSON.stringify({
          type: "join",
          conversationId,
          role: "visitor",
        }));
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "message" && data.role === "agent") {
          setHandoffStatus("connected");
          const agentMessage: ChatMessage = {
            id: data.messageId || Date.now().toString(),
            role: "assistant",
            content: data.content,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, agentMessage]);
        }
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      setHandoffWs(websocket);

      return () => {
        websocket.close();
      };
    }
  }, [handoffStatus, conversationId]);

  // Track mutation pending state changes (must be after chatMutation declaration)
  useEffect(() => {
    console.log(`[PERF-WIDGET] chatMutation.isPending: ${chatMutation.isPending}`);
    if (!chatMutation.isPending) {
      console.log(`[PERF-WIDGET] Mutation complete - suggested questions should now be visible`);
    }
  }, [chatMutation.isPending]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey('messages'), JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save messages to localStorage:', error);
    }
  }, [messages, chatbotId]);

  // Persist other state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey('leadCaptured'), leadCaptured.toString());
    } catch (error) {
      console.error('Failed to save leadCaptured to localStorage:', error);
    }
  }, [leadCaptured, chatbotId]);

  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey('leadFormSkipped'), leadFormSkipped.toString());
    } catch (error) {
      console.error('Failed to save leadFormSkipped to localStorage:', error);
    }
  }, [leadFormSkipped, chatbotId]);

  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey('hasRated'), hasRated.toString());
    } catch (error) {
      console.error('Failed to save hasRated to localStorage:', error);
    }
  }, [hasRated, chatbotId]);

  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem(getStorageKey('conversationId'), conversationId);
      }
    } catch (error) {
      console.error('Failed to save conversationId to localStorage:', error);
    }
  }, [conversationId, chatbotId]);

  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey('questionRotationIndex'), questionRotationIndex.toString());
    } catch (error) {
      console.error('Failed to save questionRotationIndex to localStorage:', error);
    }
  }, [questionRotationIndex, chatbotId]);

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
    if (!inputValue.trim() || isStreaming || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(inputValue.trim());
    setInputValue("");
    
    // Rotate questions for next display (advance by 2 since we show 2 at a time)
    if (aiGeneratedQuestions.length > 0) {
      setQuestionRotationIndex((prev) => (prev + 2) % aiGeneratedQuestions.length);
    }
  };

  const handleSuggestedQuestion = async (question: string) => {
    // Track question usage (fire and forget - don't wait for response)
    if (chatbot?.enableSuggestedQuestions === "true") {
      fetch(`/api/chatbots/${chatbotId}/suggested-questions/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText: question }),
      }).catch(err => console.error("Failed to track question usage:", err));
    }
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(question);
    
    // Rotate questions for next display (advance by 2 since we show 2 at a time)
    if (aiGeneratedQuestions.length > 0) {
      setQuestionRotationIndex((prev) => (prev + 2) % aiGeneratedQuestions.length);
    }
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
                    {linkifyText(message.content || "")}
                  </p>
                  {message.images && message.images.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.images.map((img, idx) => (
                        <div key={idx} className="rounded-lg overflow-hidden border border-border" data-testid={`image-${message.id}-${idx}`}>
                          <img
                            src={img.url}
                            alt={img.altText || img.caption || "Image"}
                            className="w-full h-auto max-h-64 object-contain"
                            loading="lazy"
                          />
                          {(img.caption || img.altText) && (
                            <div className="p-2 bg-muted/50 text-xs text-muted-foreground">
                              {img.caption || img.altText}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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

            {displayedSuggestions && (
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
          </div>
        </ScrollArea>

        {renderLeadForm()}

        {showHandoffButton && handoffStatus === "none" && (
          <div className="p-4 border-t bg-muted/30">
            <Button
              variant="default"
              className="w-full"
              style={{ backgroundColor: chatbot.accentColor }}
              onClick={handleRequestHandoff}
              disabled={handoffMutation.isPending}
              data-testid="button-request-handoff"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {handoffMutation.isPending ? "Connecting..." : "Talk to a Human Agent"}
            </Button>
          </div>
        )}

        {handoffStatus === "requested" && (
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Connecting you with an agent...</span>
            </div>
          </div>
        )}

        {handoffStatus === "connected" && (
          <div className="p-4 border-t bg-green-50 dark:bg-green-950">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Connected to live agent</span>
            </div>
          </div>
        )}

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
                      {linkifyText(message.content || "")}
                    </p>
                    {message.images && message.images.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.images.map((img, idx) => (
                          <div key={idx} className="rounded-lg overflow-hidden border border-border" data-testid={`image-${message.id}-${idx}`}>
                            <img
                              src={img.url}
                              alt={img.altText || img.caption || "Image"}
                              className="w-full h-auto max-h-64 object-contain"
                              loading="lazy"
                            />
                            {(img.caption || img.altText) && (
                              <div className="p-2 bg-muted/50 text-xs text-muted-foreground">
                                {img.caption || img.altText}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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

              {displayedSuggestions && (
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
