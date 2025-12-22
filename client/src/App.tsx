import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import CreateChatbot from "@/pages/CreateChatbot";
import EditChatbot from "@/pages/EditChatbot";
import ViewChatbot from "@/pages/ViewChatbot";
import ChatWidget from "@/pages/ChatWidget";
import TestChatbot from "@/pages/TestChatbot";
import Analytics from "@/pages/Analytics";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import Leads from "@/pages/Leads";
import CrmSettings from "@/pages/CrmSettings";
import Pricing from "@/pages/Pricing";
import Subscribe from "@/pages/Subscribe";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";
import AdminJobs from "@/pages/AdminJobs";
import AdminUserDetails from "@/pages/AdminUserDetails";
import AdminNotificationSettings from "@/pages/AdminNotificationSettings";
import NotificationSettings from "@/pages/NotificationSettings";
import TeamManagement from "@/pages/TeamManagement";
import LiveChats from "@/pages/LiveChats";
import Help from "@/pages/Help";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import AcceptableUsePolicy from "@/pages/AcceptableUsePolicy";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";
import { CookieConsent } from "@/components/CookieConsent";

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/acceptable-use-policy" component={AcceptableUsePolicy} />
      <Route path="/widget/:id" component={ChatWidget} />
      <Route path="/chat/:id" component={ChatWidget} />
      <Route component={Landing} />
    </Switch>
  );
}

function ProtectedRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" />
      </div>
    );
  }

  // If not authenticated, show public routes
  if (!isAuthenticated) {
    return <PublicRouter />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/chatbots" component={Dashboard} />
      <Route path="/create" component={CreateChatbot} />
      <Route path="/edit/:id" component={EditChatbot} />
      <Route path="/view/:id" component={ViewChatbot} />
      <Route path="/test/:id" component={TestChatbot} />
      <Route path="/analytics" component={AnalyticsDashboard} />
      <Route path="/analytics/:id" component={Analytics} />
      <Route path="/leads" component={Leads} />
      <Route path="/chatbot/:id/crm" component={CrmSettings} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/account" component={Account} />
      <Route path="/notifications" component={NotificationSettings} />
      <Route path="/team" component={TeamManagement} />
      <Route path="/live-chats" component={LiveChats} />
      <Route path="/help" component={Help} />
      <Route path="/help/:slug" component={Help} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/jobs" component={AdminJobs} />
      <Route path="/admin/users/:userId" component={AdminUserDetails} />
      <Route path="/admin/notifications" component={AdminNotificationSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const [location] = useLocation();
  
  // Widget/chat routes should NOT show cookie consent - they're embedded iframes
  const isWidgetRoute = location.startsWith('/widget/') || location.startsWith('/chat/');
  
  // Public routes that don't require authentication
  const isPublicRoute = isWidgetRoute ||
                        location.startsWith('/blog') ||
                        location === '/pricing' || 
                        location === '/login' || 
                        location === '/register' ||
                        location === '/forgot-password' ||
                        location === '/reset-password' ||
                        location === '/terms-of-service' ||
                        location === '/privacy-policy' ||
                        location === '/acceptable-use-policy';
  
  if (isPublicRoute) {
    return (
      <>
        <PublicRouter />
        {!isWidgetRoute && <CookieConsent />}
      </>
    );
  }

  return (
    <>
      <ProtectedRouter />
      <CookieConsent />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
