"use client";

import { createContext, useContext } from "react";

interface AccountContextValue {
  isAdmin: boolean;
  plan: "free" | "plus";
}

const AccountContext = createContext<AccountContextValue>({ isAdmin: false, plan: "free" });

export function AccountProvider({
  isAdmin = false,
  plan = "free",
  children,
}: {
  isAdmin?: boolean;
  plan?: "free" | "plus";
  children: React.ReactNode;
}) {
  return <AccountContext.Provider value={{ isAdmin, plan }}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  return useContext(AccountContext);
}
