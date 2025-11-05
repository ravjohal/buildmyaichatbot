import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Send, Check, X, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

type HandoffRequest = {
  handoff: {
    id: string;
    conversationId: string;
    chatbotId: string;
    status: string;
    requestedAt: string;
    acceptedAt: string | null;
    resolvedAt: string | null;
    visitorName: string | null;
    visitorEmail: string | null;
  };
  chatbot: {
    id: string;
    name: string;
  };
  conversation: {
    id: string;
    sessionId: string;
    messageCount: number;
  };
};

type Message = {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  createdAt: string;
};

export default function LiveChats() {
  const [selectedHandoff, setSelectedHandoff] = useState<HandoffRequest | null>(null);
  const [message, setMessage] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: handoffs, isLoading } = useQuery<HandoffRequest[]>({
    queryKey: ["/api/handoffs"],
    refetchInterval: 5000,
  });

  const { data: conversationMessages, isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/handoffs", selectedHandoff?.handoff.id, "messages"],
    enabled: !!selectedHandoff,
  });

  useEffect(() => {
    if (conversationMessages) {
      setMessages(conversationMessages);
    }
  }, [conversationMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedHandoff) {
      if (ws) {
        ws.close();
        setWs(null);
      }
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/live-chat`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      websocket.send(JSON.stringify({
        type: "join",
        conversationId: selectedHandoff.handoff.conversationId,
        role: "agent",
      }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "message") {
        setMessages((prev) => [...prev, {
          id: data.messageId || Date.now().toString(),
          role: data.role,
          content: data.content,
          createdAt: data.timestamp || new Date().toISOString(),
        }]);
      } else if (data.type === "typing") {
        setIsTyping(data.isTyping);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [selectedHandoff]);

  const acceptMutation = useMutation({
    mutationFn: async (handoffId: string) => {
      const res = await apiRequest("POST", `/api/handoffs/${handoffId}/accept`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/handoffs"] });
      toast({
        title: "Chat accepted",
        description: "You can now respond to the visitor.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept chat",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (handoffId: string) => {
      const res = await apiRequest("POST", `/api/handoffs/${handoffId}/resolve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/handoffs"] });
      setSelectedHandoff(null);
      toast({
        title: "Chat resolved",
        description: "The conversation has been marked as complete.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resolve chat",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !ws || !selectedHandoff) return;

    const messageContent = message.trim();
    
    // Optimistically add the message to the UI
    const agentMessage: Message = {
      id: Date.now().toString(),
      role: "agent",
      content: messageContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, agentMessage]);

    ws.send(JSON.stringify({
      type: "agent_message",
      conversationId: selectedHandoff.handoff.conversationId,
      handoffId: selectedHandoff.handoff.id,
      content: messageContent,
    }));

    setMessage("");
  };

  const handleAccept = (handoff: HandoffRequest) => {
    acceptMutation.mutate(handoff.handoff.id);
    setSelectedHandoff(handoff);
  };

  const handleResolve = () => {
    if (!selectedHandoff) return;
    resolveMutation.mutate(selectedHandoff.handoff.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-live-chats" />
      </div>
    );
  }

  const pendingHandoffs = handoffs?.filter(h => h.handoff.status === "pending") || [];
  const activeHandoffs = handoffs?.filter(h => h.handoff.status === "active") || [];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="heading-live-chats">Live Chats</h1>
        <p className="text-muted-foreground mt-2" data-testid="text-live-chats-description">
          Respond to customer requests for live support
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          {pendingHandoffs.length > 0 && (
            <Card>
              <CardHeader className="space-y-0 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending ({pendingHandoffs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingHandoffs.map((handoff) => (
                  <Card
                    key={handoff.handoff.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleAccept(handoff)}
                    data-testid={`handoff-pending-${handoff.handoff.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm" data-testid={`text-chatbot-name-${handoff.handoff.id}`}>
                            {handoff.chatbot.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {handoff.handoff.visitorName || handoff.handoff.visitorEmail || "Anonymous"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(handoff.handoff.requestedAt), "MMM d, h:mm a")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {activeHandoffs.length > 0 && (
            <Card>
              <CardHeader className="space-y-0 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Active ({activeHandoffs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeHandoffs.map((handoff) => (
                  <Card
                    key={handoff.handoff.id}
                    className={`cursor-pointer hover-elevate ${
                      selectedHandoff?.handoff.id === handoff.handoff.id ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedHandoff(handoff)}
                    data-testid={`handoff-active-${handoff.handoff.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm" data-testid={`text-active-chatbot-name-${handoff.handoff.id}`}>
                            {handoff.chatbot.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {handoff.handoff.visitorName || handoff.handoff.visitorEmail || "Anonymous"}
                          </p>
                        </div>
                        <Badge variant="default" className="text-xs">Active</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(handoff.handoff.acceptedAt!), "MMM d, h:mm a")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {pendingHandoffs.length === 0 && activeHandoffs.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center" data-testid="text-no-chats">
                  No live chat requests at the moment
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2">
          {selectedHandoff ? (
            <Card className="h-[calc(100vh-200px)] flex flex-col">
              <CardHeader className="space-y-0 pb-3 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base" data-testid="text-selected-chatbot">
                      {selectedHandoff.chatbot.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {selectedHandoff.handoff.visitorName || selectedHandoff.handoff.visitorEmail || "Anonymous visitor"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedHandoff.handoff.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResolve}
                        disabled={resolveMutation.isPending}
                        data-testid="button-resolve-chat"
                      >
                        {resolveMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Resolve
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, idx) => (
                        <div
                          key={`${msg.id}-${idx}`}
                          className={`flex ${msg.role === "agent" ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${msg.role}-${idx}`}
                        >
                          <div className={`flex gap-2 max-w-[80%] ${msg.role === "agent" ? "flex-row-reverse" : "flex-row"}`}>
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              msg.role === "agent" ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}>
                              {msg.role === "agent" ? (
                                <User className="h-4 w-4" />
                              ) : (
                                <span className="text-xs font-semibold">
                                  {msg.role === "user" ? "V" : "AI"}
                                </span>
                              )}
                            </div>
                            <div className={`rounded-lg p-3 ${
                              msg.role === "agent"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-xs mt-1 ${
                                msg.role === "agent" ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}>
                                {format(new Date(msg.createdAt), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {selectedHandoff.handoff.status === "active" && (
                <div className="border-t p-4">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      disabled={!ws}
                      data-testid="input-agent-message"
                    />
                    <Button
                      type="submit"
                      disabled={!message.trim() || !ws}
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </form>
                </div>
              )}
            </Card>
          ) : (
            <Card className="h-[calc(100vh-200px)]">
              <CardContent className="flex flex-col items-center justify-center h-full">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center" data-testid="text-select-chat">
                  Select a chat request to start responding
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
