import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import MobileTopBar from "./MobileTopBar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  // Use CSS to show/hide layouts — avoids the undefined flash on first render
  return (
    <>
      {/* ── Desktop layout (≥ 1024px) ── */}
      <div className="hidden xl:flex h-screen overflow-hidden bg-background">
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

      {/* ── Mobile / Tablet layout (< 1024px) ── */}
      <div className="flex xl:hidden flex-col min-h-screen bg-background">
        <MobileTopBar />
        <main className="flex-1 overflow-y-auto pt-14 pb-20 px-4">
          <Outlet />
        </main>
        <MobileNav />
      </div>
    </>
  );
}