import { Link } from "wouter";
import { Crown, LogOut, User as UserIcon, Shield, LayoutDashboard, Briefcase, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function DashboardHeader() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const isAdmin = user?.isAdmin === "true";
  const isFreeTier = user?.subscriptionTier === "free" && !isAdmin;

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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link href="/">
            <div className="cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-dashboard">
              <Logo size="sm" />
            </div>
          </Link>
          <div className="flex gap-3 flex-wrap items-center">
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
            {isFreeTier && (
              <Link href="/pricing">
                <Button size="default" variant="default" data-testid="button-upgrade-pro">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </Link>
            )}
            <Link href="/account">
              <Button 
                variant="outline" 
                size="default"
                data-testid="button-account"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Account
              </Button>
            </Link>
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
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted" data-testid="user-display">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={user.email} />
                  <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium" data-testid="text-user-name">{user.email}</span>
              </div>
            )}
            <Button 
              variant="outline" 
              size="default"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
