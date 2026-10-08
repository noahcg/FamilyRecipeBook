"use client";

import { createContext, useContext, useState } from "react";

interface AccountContextValue {
  isAdmin: boolean;
  plan: "free" | "plus";
  metricUnits: boolean;
  setMetricUnits: (enabled: boolean) => void;
}

const AccountContext = createContext<AccountContextValue>({ isAdmin: false, plan: "free", metricUnits: false, setMetricUnits: () => {} });

export function AccountProvider({
  isAdmin = false,
  plan = "free",
  initialMetricUnits = false,
  children,
}: {
  isAdmin?: boolean;
  plan?: "free" | "plus";
  initialMetricUnits?: boolean;
  children: React.ReactNode;
}) {
  const [metricUnits, setMetricUnits] = useState(initialMetricUnits);
  return <AccountContext.Provider value={{ isAdmin, plan, metricUnits, setMetricUnits }}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  return useContext(AccountContext);
}
