import { Link } from "wouter";
import { Crown, LogOut, User as UserIcon, Shield, LayoutDashboard, Briefcase, Users, MessageSquare, Bell, X, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface KeywordAlertTrigger {
  trigger: {
    id: string;
    keyword: string;
    messageContent: string;
    visitorName: string | null;
    visitorEmail: string | null;
    conversationId: string | null;
    triggeredAt: string;
    read: string;
  };
  chatbot: {
    id: string;
    name: string;
  };
}

export function DashboardHeader() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: unreadAlerts = [], refetch: refetchAlerts } = useQuery<KeywordAlertTrigger[]>({
    queryKey: ["/api/keyword-alerts/unread"],
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (triggerId: string) => {
      const response = await apiRequest("PUT", `/api/keyword-alerts/triggers/${triggerId}/mark-read`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keyword-alerts/unread"] });
    },
  });

  const isAdmin = user?.isAdmin === "true";
  const isFreeTier = user?.subscriptionTier === "free" && !isAdmin;
  const unreadCount = unreadAlerts.length;

  const getUserDisplay = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.email || "User";
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const handleLogout = async () => {
    await apiRequest("POST", "/api/auth/logout", {});
    queryClient.clear();
    window.location.href = "/";
  };

  return (
    <div className="border-b">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo */}
          <Link href="/">
            <div className="cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-dashboard">
              <Logo size="sm" />
            </div>
          </Link>

          {/* Center: Navigation */}
          <div className="flex gap-3 items-center flex-wrap flex-1 justify-center">
            <Link href="/">
              <Button 
                variant="outline" 
                size="default"
                data-testid="button-dashboard"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/live-chats">
              <Button 
                variant="outline" 
                size="default"
                data-testid="button-live-chats"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Live Chats
              </Button>
            </Link>
            <Link href="/team">
              <Button 
                variant="outline" 
                size="default"
                data-testid="button-team"
              >
                <Users className="w-4 h-4 mr-2" />
                Team
              </Button>
            </Link>
            <Link href="/help">
              <Button 
                variant="outline" 
                size="default"
                data-testid="button-help"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </Button>
            </Link>
            {isFreeTier && (
              <Link href="/pricing">
                <Button size="default" variant="default" data-testid="button-upgrade">
                  <Crown className="w-4 h-4 mr-2" />
                  View Plans
                </Button>
              </Link>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="relative"
                  data-testid="button-notifications"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Alerts
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 min-w-5 px-1 flex items-center justify-center text-xs"
                      data-testid="badge-notification-count"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end" data-testid="popover-notifications">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Keyword Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    {unreadCount === 0 ? "No new alerts" : `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}`}
                  </p>
                </div>
                <ScrollArea className="h-96">
                  {unreadAlerts.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground" data-testid="text-no-alerts">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No keyword alerts</p>
                      <p className="text-xs mt-1">
                        Configure keyword alerts in your chatbot settings
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {unreadAlerts.map(({ trigger, chatbot }) => (
                        <Link
                          key={trigger.id}
                          href={trigger.conversationId ? `/analytics/${chatbot.id}?conversation=${trigger.conversationId}` : `/analytics/${chatbot.id}`}
                          className="block"
                          data-testid={`link-alert-${trigger.id}`}
                        >
                          <div
                            className="p-4 hover-elevate transition-colors cursor-pointer"
                            data-testid={`alert-${trigger.id}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" data-testid={`badge-keyword-${trigger.keyword}`}>
                                    {trigger.keyword}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(trigger.triggeredAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{chatbot.name}</p>
                                  {trigger.conversationId && (
                                    <>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <p className="text-xs text-muted-foreground font-mono" data-testid={`text-session-${trigger.conversationId}`}>
                                        {trigger.conversationId.substring(0, 8)}...
                                      </p>
                                    </>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {trigger.messageContent}
                                </p>
                                {trigger.visitorName && (
                                  <p className="text-xs text-muted-foreground">
                                    From: {trigger.visitorName}
                                    {trigger.visitorEmail && ` (${trigger.visitorEmail})`}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  markAsReadMutation.mutate(trigger.id);
                                }}
                                disabled={markAsReadMutation.isPending}
                                data-testid={`button-dismiss-${trigger.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
            {isAdmin && (
              <>
                <Link href="/admin">
                  <Button 
                    variant="destructive" 
                    size="default"
                    data-testid="button-admin"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
                <Link href="/admin/jobs">
                  <Button 
                    variant="outline" 
                    size="default"
                    data-testid="button-admin-jobs"
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Jobs
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Right: Account Section (Separated) */}
          <div className="flex items-center gap-3 pl-4 border-l">
            {user && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="w-9 h-9"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.profileImageUrl || undefined} alt={user.email} />
                      <AvatarFallback className="text-xs font-semibold">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-0" align="end" data-testid="popover-user-menu">
                  <div className="p-3 border-b">
                    <p className="text-xs text-muted-foreground" data-testid="text-user-email">{user.email}</p>
                  </div>
                  <div className="p-2 space-y-1">
                    <Link href="/account">
                      <Button 
                        variant="ghost" 
                        size="default"
                        className="w-full justify-start"
                        data-testid="button-account"
                      >
                        <UserIcon className="w-4 h-4 mr-2" />
                        Account
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="default"
                      className="w-full justify-start"
                      onClick={handleLogout}
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
