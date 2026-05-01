import BottomNav from "@/components/ui/BottomNav";
import CloudSyncBootstrap from "@/components/data/CloudSyncBootstrap";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <CloudSyncBootstrap />
      <main className="max-w-lg mx-auto px-4 pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
