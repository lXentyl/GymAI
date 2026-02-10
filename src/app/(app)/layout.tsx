import BottomNav from "@/components/bottom-nav";
import Footer from "@/components/footer";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-safe">
        <div className="mx-auto max-w-lg px-4 py-6">{children}</div>
        <Footer />
      </main>
      <BottomNav />
    </div>
  );
}
