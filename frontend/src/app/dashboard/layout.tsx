"use client";

import { 
  Hexagon, 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  Settings, 
  LogOut, 
  Plus, 
  Menu,
  X,
  Moon,
  Sun,
  LifeBuoy,
  Shield,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { usePlanStore } from "@/lib/store/planStore";
import UploadPlanModal from "@/components/dashboard/UploadPlanModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Loading layout...
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
  const { theme, setTheme } = useTheme();
  
  const { user, isAuthenticated, hasHydrated, logout } = useAuthStore();
  const { searchQuery, setSearchQuery, initSocket } = usePlanStore();

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
    { name: "NYC Code Analyzer", icon: Hexagon, path: "/dashboard/analyzer" },
    { name: "My Plans", icon: FileText, path: "/dashboard/plans" },
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
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      
      {/* Sidebar - Fixed */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border/60 transform transition-transform duration-300 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-border/60">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="CodeAlgo Logo" className="w-8 h-8 object-contain rounded-md" />
              <span className="text-lg font-bold text-foreground tracking-tight">NYC House Code</span>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all",
                    isActive 
                      ? "bg-primary/10 text-primary font-semibold" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border/60">
            <div className="flex items-center gap-3 px-3 py-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-foreground">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Header */}
        <header className="h-16 bg-card/80 backdrop-blur-xl border-b border-border/60 px-6 flex items-center justify-between sticky top-0 z-30">
          <Button 
            onClick={() => setMobileOpen(!mobileOpen)}
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-xl"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl px-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Plan
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl w-10 h-10"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <UploadPlanModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} />
    </div>
  );
}
