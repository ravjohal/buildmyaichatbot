import { Link } from "wouter";
import { Crown, LogOut, User as UserIcon, Shield, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function DashboardHeader() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const isAdmin = user?.isAdmin === "true";
  const isFreeTier = user?.subscriptionTier === "free" && !isAdmin;

  return (
    <div className="border-b">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link href="/">
            <h1 className="text-2xl font-bold tracking-tight cursor-pointer hover:text-primary transition-colors" data-testid="link-dashboard">
              AI Chatbot Builder
            </h1>
          </Link>
          <div className="flex gap-3 flex-wrap">
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
            )}
            <Button 
              variant="outline" 
              size="default"
              onClick={() => window.location.href = "/api/logout"}
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
