"use client";

import { createContext, useContext } from "react";

interface AccountContextValue {
  isAdmin: boolean;
}

const AccountContext = createContext<AccountContextValue>({ isAdmin: false });

export function AccountProvider({
  isAdmin = false,
  children,
}: {
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  return <AccountContext.Provider value={{ isAdmin }}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  return useContext(AccountContext);
}
