import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  User, 
  Mail, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft,
  Crown,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AccountDetails {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  subscriptionTier: "free" | "paid";
  createdAt: string;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    canceledAt: number | null;
    billingCycle: string;
    amount: number;
    currency: string;
  } | null;
}

export default function Account() {
  const { toast } = useToast();
  const { data: account, isLoading, isError, error } = useQuery<AccountDetails>({
    queryKey: ["/api/account"],
  });

  const billingPortalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/portal", {});
      return response as { url: string };
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      active: { variant: "default", icon: CheckCircle2 },
      trialing: { variant: "secondary", icon: Calendar },
      past_due: { variant: "destructive", icon: XCircle },
      canceled: { variant: "outline", icon: XCircle },
      unpaid: { variant: "destructive", icon: XCircle },
    };

    const config = statusMap[status] || { variant: "outline" as const, icon: Calendar };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Account</CardTitle>
            <CardDescription>
              {(error as any)?.message || "Unable to load your account details. Please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
              data-testid="button-retry"
            >
              Retry
            </Button>
            <Link href="/">
              <Button variant="outline" className="gap-2 w-full">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!account) {
    return null;
  }

  const initials = `${account.firstName?.[0] || ""}${account.lastName?.[0] || ""}`.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-4" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account details and subscription
          </p>
        </div>

        <div className="space-y-6">
          <Card data-testid="card-profile">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Your personal account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={account.profileImageUrl || undefined} alt={`${account.firstName} ${account.lastName}`} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-lg" data-testid="text-user-name">
                    {account.firstName} {account.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-user-email">
                    <Mail className="w-3 h-3" />
                    {account.email}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Member since:</span>
                  </div>
                  <span className="font-medium" data-testid="text-member-since">
                    {formatDateTime(account.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Account ID:</span>
                  </div>
                  <span className="font-mono text-xs" data-testid="text-account-id">
                    {account.id}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-subscription">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Subscription
              </CardTitle>
              <CardDescription>Your current plan and billing details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-lg">Current Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {account.subscriptionTier === "paid" ? "Pro Plan" : "Free Plan"}
                  </p>
                </div>
                <Badge 
                  variant={account.subscriptionTier === "paid" ? "default" : "secondary"}
                  data-testid="badge-subscription-tier"
                >
                  {account.subscriptionTier === "paid" ? "Pro" : "Free"}
                </Badge>
              </div>

              {account.subscription ? (
                <>
                  <Separator />
                  
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <span data-testid="badge-subscription-status">
                        {getStatusBadge(account.subscription.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Billing:</span>
                      <span className="font-medium" data-testid="text-billing-amount">
                        {formatCurrency(account.subscription.amount, account.subscription.currency)} / {account.subscription.billingCycle}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current period:</span>
                      <span className="text-sm" data-testid="text-billing-period">
                        {formatDate(account.subscription.currentPeriodStart)} - {formatDate(account.subscription.currentPeriodEnd)}
                      </span>
                    </div>

                    {account.subscription.cancelAtPeriodEnd && (
                      <div className="rounded-md bg-muted p-4" data-testid="alert-cancel-at-period-end">
                        <p className="text-sm font-medium">Subscription Ending</p>
                        <p className="text-sm text-muted-foreground">
                          Your subscription will end on {formatDate(account.subscription.currentPeriodEnd)}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Subscription ID:</span>
                      <span className="font-mono text-xs" data-testid="text-subscription-id">
                        {account.subscription.id}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2" 
                      data-testid="button-manage-billing"
                      onClick={() => billingPortalMutation.mutate()}
                      disabled={billingPortalMutation.isPending}
                    >
                      <ExternalLink className="w-4 h-4" />
                      {billingPortalMutation.isPending ? "Opening..." : "Manage Billing"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Separator />
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      You're currently on the Free plan with limited features.
                    </p>
                    <Link href="/pricing">
                      <Button data-testid="button-upgrade-pro">
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade to Pro
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
