import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, UserPlus, Mail, Phone, Building2, MessageSquare, Calendar, ExternalLink, Link as LinkIcon, TestTube } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Chatbot } from "@shared/schema";
import { DashboardHeader } from "@/components/DashboardHeader";

interface Lead {
  id: number;
  chatbotId: number;
  sessionId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  customData: Record<string, any> | null;
  source: string;
  sourceUrl: string | null;
  createdAt: Date;
}

export default function Leads() {
  const { user } = useAuth();
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>("");

  const { data: chatbots, isLoading: loadingChatbots } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
  });

  const { data: leads, isLoading: loadingLeads } = useQuery<Lead[]>({
    queryKey: [`/api/chatbots/${selectedChatbotId}/leads`],
    enabled: !!selectedChatbotId,
  });

  const getSourceBadge = (source: string, sourceUrl: string | null) => {
    let icon;
    let label;
    let variant: "default" | "secondary" | "outline" = "secondary";

    switch (source) {
      case "widget":
        icon = <ExternalLink className="w-3 h-3" />;
        label = "Embedded Widget";
        variant = "default";
        break;
      case "direct_link":
        icon = <LinkIcon className="w-3 h-3" />;
        label = "Direct Link";
        variant = "outline";
        break;
      case "test":
        icon = <TestTube className="w-3 h-3" />;
        label = "Test Page";
        variant = "secondary";
        break;
      default:
        icon = <ExternalLink className="w-3 h-3" />;
        label = "Unknown";
        variant = "secondary";
    }

    return (
      <div className="flex flex-col gap-1">
        <Badge variant={variant} className="w-fit">
          <div className="flex items-center gap-1">
            {icon}
            <span>{label}</span>
          </div>
        </Badge>
        {sourceUrl && source === "widget" && (
          <a 
            href={sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground truncate max-w-[200px]"
            title={sourceUrl}
          >
            {sourceUrl}
          </a>
        )}
      </div>
    );
  };

  const handleExport = async () => {
    if (!selectedChatbotId) return;

    const response = await fetch(`/api/chatbots/${selectedChatbotId}/leads/export`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${selectedChatbotId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const selectedChatbot = chatbots?.find((c) => c.id.toString() === selectedChatbotId);
  const canViewLeads = user?.subscriptionTier === "paid" || user?.isAdmin === "true";

  if (loadingChatbots) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground mt-1">
              View and export leads captured through your chatbot conversations
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">

      {!canViewLeads && (
        <Card className="mb-6 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Upgrade to Pro
            </CardTitle>
            <CardDescription>
              Lead capture and analytics are only available on the Pro plan. Upgrade to unlock this feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button data-testid="button-upgrade-pro">
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Captured Leads</CardTitle>
              <CardDescription>
                Select a chatbot to view its captured leads
              </CardDescription>
            </div>
            {selectedChatbotId && leads && leads.length > 0 && canViewLeads && (
              <Button
                onClick={handleExport}
                variant="outline"
                className="gap-2"
                data-testid="button-export-csv"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Select
              value={selectedChatbotId}
              onValueChange={setSelectedChatbotId}
              disabled={!canViewLeads}
            >
              <SelectTrigger className="w-full max-w-md" data-testid="select-chatbot">
                <SelectValue placeholder="Select a chatbot" />
              </SelectTrigger>
              <SelectContent>
                {chatbots?.map((chatbot) => (
                  <SelectItem key={chatbot.id} value={chatbot.id.toString()}>
                    {chatbot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedChatbotId && selectedChatbot && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Lead Capture:</span>
                {selectedChatbot.leadCaptureEnabled === "true" ? (
                  <Badge variant="default" className="bg-green-600">Enabled</Badge>
                ) : (
                  <Badge variant="secondary">Disabled</Badge>
                )}
              </div>
            </div>
          )}

          {loadingLeads && (
            <div className="flex items-center justify-center h-48">
              <div className="animate-pulse text-muted-foreground">Loading leads...</div>
            </div>
          )}

          {!selectedChatbotId && !loadingLeads && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Select a chatbot to view its captured leads
              </p>
            </div>
          )}

          {selectedChatbotId && !loadingLeads && leads && leads.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No leads captured yet</p>
              <p className="text-sm text-muted-foreground">
                Leads will appear here when visitors submit the lead capture form in your chatbot
              </p>
            </div>
          )}

          {selectedChatbotId && !loadingLeads && leads && leads.length > 0 && canViewLeads && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Name
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Company
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Message
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Source
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} data-testid={`lead-row-${lead.id}`}>
                      <TableCell className="font-medium">
                        {lead.name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {lead.email || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {lead.phone || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {lead.company || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {lead.message ? (
                          <div className="max-w-xs truncate" title={lead.message}>
                            {lead.message}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getSourceBadge(lead.source, lead.sourceUrl)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {selectedChatbotId && !loadingLeads && leads && leads.length > 0 && canViewLeads && (
            <div className="mt-4 text-sm text-muted-foreground">
              Total leads: {leads.length}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
