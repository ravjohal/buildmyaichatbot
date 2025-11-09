import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, X, Mail, Clock, Check, Settings, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DashboardHeader } from "@/components/DashboardHeader";

type TeamMember = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
};

type TeamInvitation = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  expiresAt: string;
};

type TeamMemberPermissions = {
  id: string;
  userId: string;
  canViewAnalytics: string;
  canManageChatbots: string;
  canRespondToChats: string;
  canViewLeads: string;
  canManageTeam: string;
  canAccessSettings: string;
};

type User = {
  id: string;
  email: string;
  subscriptionTier: string;
  isAdmin: string;
};

const TEAM_MEMBER_LIMITS: Record<string, number> = {
  free: 0,
  starter: 3,
  business: 10,
  pro: 10,
  scale: -1, // unlimited
};

export default function TeamManagement() {
  const [email, setEmail] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [invitationToCancel, setInvitationToCancel] = useState<TeamInvitation | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<TeamMember | null>(null);
  const [permissions, setPermissions] = useState<TeamMemberPermissions | null>(null);
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data, isLoading } = useQuery<{ members: TeamMember[]; invitations: TeamInvitation[] }>({
    queryKey: ["/api/team/members"],
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/team/invite", { email });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      setEmail("");
      toast({
        title: "Invitation sent",
        description: "Team member invitation has been sent via email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/team/members/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      setMemberToRemove(null);
      toast({
        title: "Team member removed",
        description: "The team member has been removed from your team.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove team member",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/team/invitations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      setInvitationToCancel(null);
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ memberId, permissions }: { memberId: string; permissions: Partial<TeamMemberPermissions> }) => {
      const res = await apiRequest("PUT", `/api/team/members/${memberId}/permissions`, permissions);
      return res.json();
    },
    onSuccess: () => {
      setEditingPermissions(null);
      setPermissions(null);
      toast({
        title: "Permissions updated",
        description: "Team member permissions have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update permissions",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleOpenPermissions = async (member: TeamMember) => {
    setEditingPermissions(member);
    try {
      const res = await fetch(`/api/team/members/${member.id}/permissions`, {
        credentials: 'include',
      });
      const perms = await res.json();
      setPermissions(perms);
    } catch (error) {
      toast({
        title: "Failed to load permissions",
        description: "Please try again",
        variant: "destructive",
      });
      setEditingPermissions(null);
    }
  };

  const handleSavePermissions = () => {
    if (editingPermissions && permissions) {
      updatePermissionsMutation.mutate({
        memberId: editingPermissions.id,
        permissions,
      });
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      inviteMutation.mutate(email.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-team" />
      </div>
    );
  }

  const members = data?.members || [];
  const invitations = data?.invitations || [];
  
  // Admin users have unlimited team members (equivalent to Scale tier)
  const tierLimit = user 
    ? (user.isAdmin === "true" ? -1 : TEAM_MEMBER_LIMITS[user.subscriptionTier] || 0)
    : 0;
  const currentUsage = members.length + invitations.length;
  const isAtLimit = tierLimit !== -1 && currentUsage >= tierLimit;
  
  const tierNames: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    business: "Business",
    pro: "Pro",
    scale: "Scale"
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-team-management">Team Management</h1>
          <p className="text-muted-foreground mt-2" data-testid="text-team-description">
            Invite team members to help respond to live chat requests from your customers.
          </p>
        </div>
      
      {user && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Team Capacity</h3>
                  <Badge variant="secondary">{tierNames[user.subscriptionTier] || user.subscriptionTier}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {tierLimit === -1 
                    ? `Unlimited team members on ${tierNames[user.subscriptionTier]} plan`
                    : `${currentUsage} of ${tierLimit} team slots used`
                  }
                </p>
              </div>
              {isAtLimit && tierLimit > 0 && (
                <Button variant="outline" size="default" asChild data-testid="button-upgrade-team">
                  <a href="/pricing">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </a>
                </Button>
              )}
            </div>
            {isAtLimit && (
              <p className="text-sm text-destructive mt-3" data-testid="text-limit-reached">
                You've reached your team member limit. Upgrade to add more members.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </CardTitle>
          <CardDescription>
            Send an email invitation to add a new agent to your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="email" className="sr-only">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="agent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={inviteMutation.isPending}
                data-testid="input-invite-email"
              />
            </div>
            <Button
              type="submit"
              disabled={inviteMutation.isPending || !email.trim() || isAtLimit}
              data-testid="button-send-invite"
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription>
              Invitations that have been sent but not yet accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                  data-testid={`invitation-${invitation.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`text-invitation-email-${invitation.id}`}>
                        {invitation.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setInvitationToCancel(invitation)}
                    data-testid={`button-cancel-invitation-${invitation.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Team Members ({members.length})
            </CardTitle>
            <CardDescription>
              Active team members who can respond to live chats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                  data-testid={`member-${member.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-semibold text-primary">
                        {member.firstName?.[0] || member.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium" data-testid={`text-member-name-${member.id}`}>
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.email}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {member.role === 'team_member' ? 'Agent' : member.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-member-email-${member.id}`}>
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => handleOpenPermissions(member)}
                      data-testid={`button-permissions-${member.id}`}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Permissions
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMemberToRemove(member)}
                      data-testid={`button-remove-member-${member.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {members.length === 0 && invitations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center" data-testid="text-no-team-members">
              No team members yet. Invite your first agent to get started!
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold">
                {memberToRemove?.firstName && memberToRemove?.lastName
                  ? `${memberToRemove.firstName} ${memberToRemove.lastName}`
                  : memberToRemove?.email}
              </span>
              ? They will lose access to your chatbots and live chat dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && removeMutation.mutate(memberToRemove.id)}
              data-testid="button-confirm-remove"
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!invitationToCancel} onOpenChange={() => setInvitationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation for{" "}
              <span className="font-semibold">{invitationToCancel?.email}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-cancel-invitation">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invitationToCancel && cancelInvitationMutation.mutate(invitationToCancel.id)}
              data-testid="button-confirm-cancel-invitation"
            >
              {cancelInvitationMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Invitation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingPermissions} onOpenChange={() => {
        setEditingPermissions(null);
        setPermissions(null);
      }}>
        <DialogContent data-testid="dialog-permissions">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>
              Control what {editingPermissions?.firstName || editingPermissions?.email} can access and manage.
            </DialogDescription>
          </DialogHeader>
          {permissions ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="canViewAnalytics">View Analytics</Label>
                  <p className="text-sm text-muted-foreground">Access chatbot analytics and performance data</p>
                </div>
                <Switch
                  id="canViewAnalytics"
                  checked={permissions.canViewAnalytics === "true"}
                  onCheckedChange={(checked) => setPermissions({...permissions, canViewAnalytics: checked ? "true" : "false"})}
                  data-testid="switch-view-analytics"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="canManageChatbots">Manage Chatbots</Label>
                  <p className="text-sm text-muted-foreground">Create, edit, and delete chatbots</p>
                </div>
                <Switch
                  id="canManageChatbots"
                  checked={permissions.canManageChatbots === "true"}
                  onCheckedChange={(checked) => setPermissions({...permissions, canManageChatbots: checked ? "true" : "false"})}
                  data-testid="switch-manage-chatbots"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="canRespondToChats">Respond to Live Chats</Label>
                  <p className="text-sm text-muted-foreground">Answer live chat requests from visitors</p>
                </div>
                <Switch
                  id="canRespondToChats"
                  checked={permissions.canRespondToChats === "true"}
                  onCheckedChange={(checked) => setPermissions({...permissions, canRespondToChats: checked ? "true" : "false"})}
                  data-testid="switch-respond-chats"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="canViewLeads">View Leads</Label>
                  <p className="text-sm text-muted-foreground">Access captured lead information</p>
                </div>
                <Switch
                  id="canViewLeads"
                  checked={permissions.canViewLeads === "true"}
                  onCheckedChange={(checked) => setPermissions({...permissions, canViewLeads: checked ? "true" : "false"})}
                  data-testid="switch-view-leads"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="canManageTeam">Manage Team</Label>
                  <p className="text-sm text-muted-foreground">Invite and remove team members</p>
                </div>
                <Switch
                  id="canManageTeam"
                  checked={permissions.canManageTeam === "true"}
                  onCheckedChange={(checked) => setPermissions({...permissions, canManageTeam: checked ? "true" : "false"})}
                  data-testid="switch-manage-team"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="canAccessSettings">Access Settings</Label>
                  <p className="text-sm text-muted-foreground">Modify account and subscription settings</p>
                </div>
                <Switch
                  id="canAccessSettings"
                  checked={permissions.canAccessSettings === "true"}
                  onCheckedChange={(checked) => setPermissions({...permissions, canAccessSettings: checked ? "true" : "false"})}
                  data-testid="switch-access-settings"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingPermissions(null);
                setPermissions(null);
              }}
              data-testid="button-cancel-permissions"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending || !permissions}
              data-testid="button-save-permissions"
            >
              {updatePermissionsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
