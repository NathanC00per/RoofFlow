import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileTopBar from "./MobileTopBar";
import MobileNav from "./MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AppLayout() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <MobileTopBar />
        {/* top-14 = fixed header height, pb-16 = fixed bottom nav height */}
        <main className="flex-1 overflow-y-auto pt-14 pb-20 px-4">
          <Outlet />
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}