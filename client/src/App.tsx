import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import CreateChatbot from "@/pages/CreateChatbot";
import EditChatbot from "@/pages/EditChatbot";
import ChatWidget from "@/pages/ChatWidget";
import TestChatbot from "@/pages/TestChatbot";
import Analytics from "@/pages/Analytics";
import Pricing from "@/pages/Pricing";
import Subscribe from "@/pages/Subscribe";
import Account from "@/pages/Account";
import Admin from "@/pages/Admin";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/widget/:id" component={ChatWidget} />
      <Route component={Landing} />
    </Switch>
  );
}

function ProtectedRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return <PublicRouter />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/create" component={CreateChatbot} />
      <Route path="/edit/:id" component={EditChatbot} />
      <Route path="/test/:id" component={TestChatbot} />
      <Route path="/analytics/:id" component={Analytics} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/account" component={Account} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const [location] = useLocation();
  
  // Only skip authentication for truly public routes (widget and pricing)
  // Homepage (/) should check authentication to show Dashboard vs Landing
  const isPublicRoute = location.startsWith('/widget/') || location === '/pricing';
  
  if (isPublicRoute) {
    return <PublicRouter />;
  }

  return <ProtectedRouter />;
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
