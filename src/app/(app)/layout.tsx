import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  // Send unauthenticated/stale sessions through logout so the cookie is cleared
  // before landing on /login (otherwise the middleware bounces them back).
  if (!user) redirect("/api/auth/logout");

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar userName={user.name} />
      <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
