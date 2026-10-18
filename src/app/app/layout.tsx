import { getViewer } from "@/lib/auth";
import { Wordmark } from "@/components/ui/wordmark";
import { UserChip } from "@/components/user-chip";
import { SideNav, TabBar } from "./nav";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const viewer = await getViewer();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-hairline px-4 py-6 lg:flex">
        <Wordmark href="/app" className="px-3" />
        <div className="mt-8">
          <SideNav />
        </div>
        <div className="mt-auto">
          <UserChip profile={viewer} />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline bg-porcelain/95 px-4 backdrop-blur lg:hidden">
          <Wordmark href="/app" />
          <UserChip profile={viewer} compact />
        </header>
        <main className="mx-auto w-full max-w-[1080px] px-4 pt-6 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>
      </div>
      <TabBar />
    </div>
  );
}
