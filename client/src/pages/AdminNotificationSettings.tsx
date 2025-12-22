import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Mail, ChevronLeft, Plus, Trash2, Save, Bell, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { User } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/DashboardHeader";

interface UserNotificationSetting {
  id: string;
  userId: string;
  notificationType: string;
  emailAddress: string;
  enabled: string;
  createdAt: string;
  updatedAt: string;
}

interface UserWithSettings {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    subscriptionTier: string;
  };
  settings: UserNotificationSetting[];
}

const NOTIFICATION_TYPES = [
  { value: 'new_user_signup', label: 'New User Signup', description: 'When a new user registers' },
  { value: 'new_lead', label: 'New Lead', description: 'When a chatbot captures a lead' },
  { value: 'unanswered_question', label: 'Unanswered Question', description: 'When a chatbot cannot answer' },
  { value: 'weekly_report', label: 'Weekly Report', description: 'Weekly performance summary' },
  { value: 'reindex_failed', label: 'Reindex Failed', description: 'When knowledge base reindexing fails' },
  { value: 'keyword_alert', label: 'Keyword Alert', description: 'When specified keywords are mentioned' },
  { value: 'team_invitation', label: 'Team Invitation', description: 'Team invitation emails' },
  { value: 'live_chat_request', label: 'Live Chat Request', description: 'When a visitor requests live chat' },
  { value: 'password_reset', label: 'Password Reset', description: 'Password reset emails' },
];

export default function AdminNotificationSettings() {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [emailAddress, setEmailAddress] = useState<string>("");
  const [enabled, setEnabled] = useState(true);

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: usersWithSettings, isLoading } = useQuery<UserWithSettings[]>({
    queryKey: ["/api/admin/notification-settings"],
    enabled: currentUser?.isAdmin === "true",
  });

  const addSettingMutation = useMutation({
    mutationFn: async (data: { userId: string; notificationType: string; emailAddress: string; enabled: string }) => {
      return await apiRequest("POST", `/api/admin/users/${data.userId}/notification-settings`, {
        notificationType: data.notificationType,
        emailAddress: data.emailAddress,
        enabled: data.enabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-settings"] });
      toast({
        title: "Success",
        description: "Notification setting added successfully",
      });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add notification setting",
        variant: "destructive",
      });
    },
  });

  const deleteSettingMutation = useMutation({
    mutationFn: async (settingId: string) => {
      return await apiRequest("DELETE", `/api/admin/notification-settings/${settingId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-settings"] });
      toast({
        title: "Success",
        description: "Notification setting deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification setting",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedType("");
    setEmailAddress("");
    setEnabled(true);
  };

  const handleAddSetting = () => {
    if (!selectedUserId || !selectedType || !emailAddress) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    addSettingMutation.mutate({
      userId: selectedUserId,
      notificationType: selectedType,
      emailAddress,
      enabled: enabled ? "true" : "false",
    });
  };

  const getNotificationTypeLabel = (type: string) => {
    return NOTIFICATION_TYPES.find(t => t.value === type)?.label || type;
  };

  if (currentUser && currentUser.isAdmin !== "true") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground">
                  You do not have permission to access this page.
                </p>
              </div>
              <Link href="/">
                <Button data-testid="button-back-dashboard">Return to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back-admin">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Bell className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-notification-settings">
              Notification Settings
            </h1>
            <p className="text-muted-foreground">
              Configure email delivery addresses for each notification type per user
            </p>
          </div>
        </div>

        <Card data-testid="card-notification-settings">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0">
            <div>
              <CardTitle>User Notification Email Configuration</CardTitle>
              <CardDescription>
                Set custom email addresses for different notification types. Users without custom settings will receive notifications at their account email.
              </CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-setting">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Setting
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Notification Setting</DialogTitle>
                  <DialogDescription>
                    Configure a custom email address for a specific notification type.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger data-testid="select-user">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersWithSettings?.map(({ user }) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notificationType">Notification Type</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger data-testid="select-notification-type">
                        <SelectValue placeholder="Select notification type" />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTIFICATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <span>{type.label}</span>
                              <span className="text-muted-foreground text-xs ml-2">
                                - {type.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailAddress">Email Address</Label>
                    <Input
                      id="emailAddress"
                      type="email"
                      placeholder="notifications@example.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      data-testid="input-email-address"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enabled"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                      data-testid="switch-enabled"
                    />
                    <Label htmlFor="enabled">Enabled</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddSetting} 
                    disabled={addSettingMutation.isPending}
                    data-testid="button-save-setting"
                  >
                    {addSettingMutation.isPending ? "Saving..." : "Save Setting"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Notification Type</TableHead>
                      <TableHead>Email Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersWithSettings?.flatMap(({ user, settings }) =>
                      settings.map((setting) => (
                        <TableRow key={setting.id} data-testid={`row-setting-${setting.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" data-testid={`badge-type-${setting.id}`}>
                              {getNotificationTypeLabel(setting.notificationType)}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-email-${setting.id}`}>
                            {setting.emailAddress}
                          </TableCell>
                          <TableCell>
                            {setting.enabled === "true" ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                <Check className="w-3 h-3 mr-1" />
                                Enabled
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <X className="w-3 h-3 mr-1" />
                                Disabled
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSettingMutation.mutate(setting.id)}
                              disabled={deleteSettingMutation.isPending}
                              data-testid={`button-delete-${setting.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {(!usersWithSettings || usersWithSettings.every(u => u.settings.length === 0)) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Mail className="w-8 h-8" />
                            <p>No custom notification settings configured</p>
                            <p className="text-sm">
                              Add settings to customize email delivery for specific notification types.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Behavior</CardTitle>
            <CardDescription>
              How notifications work without custom settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {NOTIFICATION_TYPES.map((type) => (
                <div key={type.value} className="p-4 border rounded-lg">
                  <h4 className="font-medium">{type.label}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {type.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Default: User's account email
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
