import { requireSession } from "@/lib/auth";
import { AppLayout } from "@/components/shared/app-layout";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return <AppLayout>{children}</AppLayout>;
}