"use client";

import { useContext } from "react";

import { AuthContext, type AuthContextValue } from "@/components/providers/auth-provider";

export function useAuth(): AuthContextValue {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return authContext;
}
