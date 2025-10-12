import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // User is authenticated if we have user data (not null)
  const isAuthenticated = user !== null && user !== undefined;

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}
