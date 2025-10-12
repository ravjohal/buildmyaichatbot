import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import CreateChatbot from "@/pages/CreateChatbot";
import EditChatbot from "@/pages/EditChatbot";
import ChatWidget from "@/pages/ChatWidget";
import TestChatbot from "@/pages/TestChatbot";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/widget/:id" component={ChatWidget} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/create" component={CreateChatbot} />
      <Route path="/edit/:id" component={EditChatbot} />
      <Route path="/test/:id" component={TestChatbot} />
      <Route path="/widget/:id" component={ChatWidget} />
      <Route component={NotFound} />
    </Switch>
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
