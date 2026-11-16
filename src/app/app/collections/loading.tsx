import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui";

export default function CollectionLoading() {
  return <AppShell><div role="status" className="p-5 sm:p-8"><Card><p className="font-bold text-green-deep">Loading collection…</p></Card></div></AppShell>;
}
