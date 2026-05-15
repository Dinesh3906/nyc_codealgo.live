"use client";

import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  LogOut, 
  Plus, 
  Menu,
  X,
  LifeBuoy,
  Shield,
  Wrench,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { usePlanStore } from "@/lib/store/planStore";
import UploadPlanModal from "@/components/dashboard/UploadPlanModal";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b1326] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[#bbcabf]">
          <div className="w-5 h-5 border-2 border-[#4edea3]/20 border-t-[#4edea3] rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    }>
      <DashboardContent>{children}</DashboardContent>
    </Suspense>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { user, isAuthenticated, hasHydrated, logout } = useAuthStore();
  const { initSocket } = usePlanStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !hasHydrated) return;

    if (!isAuthenticated) {
      const success = searchParams.get('success');
      const sessionId = searchParams.get('session_id');
      if (pathname === '/dashboard/billing' && success === 'true' && sessionId) {
        sessionStorage.setItem('nyc-house-code-pending-checkout-session', sessionId);
      }

      router.replace('/login');
      return;
    }

    initSocket();
  }, [mounted, hasHydrated, isAuthenticated, initSocket, pathname, router, searchParams]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navItems = [
    { name: "Overview", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Analyzer", icon: Shield, path: "/dashboard/analyzer", label: "AI" },
    { name: "My Plans", icon: FileText, path: "/dashboard/plans" },
    { name: "Services", icon: Wrench, path: "/dashboard/services" },
    { name: "Billing", icon: CreditCard, path: "/dashboard/billing" },
    { name: "Help & Feedback", icon: LifeBuoy, path: "/dashboard/settings" },
  ];

  const adminNavItems = user?.email === 'chalams115@gmail.com' ? [
    { name: "Admin Center", icon: Shield, path: "/dashboard/admin/feedback" }
  ] : [];

  const allNavItems = [...navItems, ...adminNavItems];

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : "U";

  if (!mounted || !hasHydrated) {
    return (
      <div className="min-h-screen bg-[#0b1326] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[#bbcabf]">
          <div className="w-5 h-5 border-2 border-[#4edea3]/20 border-t-[#4edea3] rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1326] flex">
      
      {/* ── Sidebar ── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-[260px] bg-[#0d1528] border-r border-white/[0.06] transform transition-transform duration-300 lg:translate-x-0 flex flex-col",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand */}
        <div className="p-5 pb-4 border-b border-white/[0.06]">
          <Link href="/dashboard" className="flex items-center gap-2 text-[#4edea3] font-bold tracking-tight">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
            <span className="text-base">NYC CODES</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          <p className="px-3 py-2 text-[10px] font-bold tracking-[0.15em] uppercase text-[#bbcabf]/40">Navigation</p>
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 group relative",
                  isActive 
                    ? "bg-[#4edea3]/10 text-[#4edea3] nav-active-bar" 
                    : "text-[#bbcabf] hover:text-[#dae2fd] hover:bg-white/[0.03]"
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="flex-1">{item.name}</span>
                {(item as any).label && (
                  <span className="text-[10px] font-bold bg-[#4edea3]/15 text-[#4edea3] px-1.5 py-0.5 rounded">
                    {(item as any).label}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-2 py-2 mb-3">
            <div className="w-9 h-9 rounded-md bg-[#4edea3]/15 flex items-center justify-center text-xs font-bold text-[#4edea3]">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#dae2fd] truncate">{user?.name || "User"}</p>
              <p className="text-[11px] text-[#bbcabf]/60 truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/5 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px]">
        {/* Header */}
        <header className="h-14 bg-[#0d1528]/80 backdrop-blur-md border-b border-white/[0.06] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-md text-[#bbcabf] hover:bg-white/[0.04] transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#bbcabf]/50">
              <span>Dashboard</span>
              {pathname !== '/dashboard' && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-[#dae2fd] capitalize">
                    {pathname.split('/').pop()?.replace(/-/g, ' ')}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-xs font-bold tracking-wider uppercase px-4 py-2 rounded-md transition-all active:scale-[0.97] shadow-sm shadow-[#4edea3]/10"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Plan</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <UploadPlanModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />
    </div>
  );
}
