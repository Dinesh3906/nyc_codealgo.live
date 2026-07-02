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
  Sparkles,
  Database,
  Bell,
  Info,
  AlertTriangle,
  Megaphone,
  Gift
} from "lucide-react";
import Image from 'next/image';
import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { usePlanStore } from "@/lib/store/planStore";
import UploadPlanModal from "@/components/dashboard/UploadPlanModal";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { toast } from "react-hot-toast";

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

  const authCheckingRef = useRef(false);

  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  
  const { user, isAuthenticated, hasHydrated, logout, login } = useAuthStore();
  const { searchQuery, setSearchQuery, initSocket } = usePlanStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !hasHydrated) return;

    const checkAuthStatus = async () => {
      const oauth = searchParams.get('oauth');
      
      if (oauth === 'success' || !user) {
        if (authCheckingRef.current) return;
        authCheckingRef.current = true;
        try {
          const res = await api.get('/auth/me');
          login(res.data);
          if (oauth === 'success') {
            router.replace('/dashboard');
          }
          return;
        } catch (err) {
          logout();
          router.replace('/login');
          return;
        } finally {
          authCheckingRef.current = false;
        }
      }

      if (!isAuthenticated && !user) {
        const success = searchParams.get('success');
        const sessionId = searchParams.get('session_id');
        if (pathname === '/dashboard/billing' && success === 'true' && sessionId) {
          try {
            sessionStorage.setItem('nyc-house-code-pending-checkout-session', sessionId);
          } catch {}
        }

        router.replace('/login');
        return;
      }

      initSocket();
    };

    checkAuthStatus();
  }, [mounted, hasHydrated, isAuthenticated, user, initSocket, pathname, router, searchParams, login, logout]);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
    } catch (error) {
      setNotifications([]);
    }
  };

  useEffect(() => {
    if (mounted && hasHydrated && isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [mounted, hasHydrated, isAuthenticated]);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error('Could not update notifications.');
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      toast.error('Could not update notification.');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
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

  const adminNavItems = user?.role === 'admin' ? [
    { name: "Admin Center", icon: Shield, path: "/dashboard/admin/feedback" },
    { name: "User Database", icon: Database, path: "/dashboard/admin/database" }
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
              <Image src="/logo.png" alt="PermitIQ by Aureon NYC Logo" width={32} height={32} className="w-8 h-8 object-contain rounded-md" priority={true} />
              <span className="text-lg font-bold text-foreground tracking-tight">PermitIQ</span>
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

          <div className="flex items-center gap-3 lg:ml-0 ml-3">
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl px-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Plan
            </Button>

            <Button
              id="theme-toggle-btn-dashboard"
              variant="ghost"
              size="icon"
              className="rounded-xl w-10 h-10 theme-toggle-trigger"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {!mounted || theme !== 'dark' ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-primary" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <Button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                variant="ghost"
                size="icon"
                className="rounded-xl w-10 h-10 relative"
              >
                <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 text-[7px] font-bold text-white rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {showNotifDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifDropdown(false)} />
                  <div className="absolute right-0 top-12 w-80 bg-card border border-border/60 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-155">
                    <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
                      <span className="text-sm font-bold text-foreground">Notifications</span>
                      {unreadCount > 0 && (
                        <Button 
                          onClick={handleMarkAllRead} 
                          variant="link" 
                          className="h-auto p-0 text-xs text-blue-500 hover:text-blue-400 font-semibold"
                        >
                          Mark all as read
                        </Button>
                      )}
                    </div>
                    <div className="overflow-y-auto max-h-72 divide-y divide-border/40">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                          <Bell className="w-8 h-8 opacity-20" />
                          <p className="text-xs">All caught up! No notifications.</p>
                        </div>
                      ) : (
                        notifications.map((item) => {
                          let Icon = Info;
                          let iconClass = "text-blue-500 bg-blue-500/10";
                          if (item.type === 'gift') {
                            Icon = Gift;
                            iconClass = "text-emerald-500 bg-emerald-500/10";
                          } else if (item.type === 'alert') {
                            Icon = AlertTriangle;
                            iconClass = "text-red-500 bg-red-500/10";
                          } else if (item.type === 'news') {
                            Icon = Megaphone;
                            iconClass = "text-indigo-500 bg-indigo-500/10";
                          }

                          return (
                            <div 
                              key={item.id} 
                              onClick={() => {
                                handleMarkOneRead(item.id);
                                setSelectedNotification(item);
                                setShowNotifDropdown(false);
                              }}
                              className={cn(
                                "p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-muted/30 text-left",
                                !item.isRead ? "bg-primary/5 border-l-2 border-primary" : ""
                              )}
                            >
                              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", iconClass)}>
                                <Icon className="w-4.5 h-4.5" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <p className={cn("text-xs font-semibold text-foreground truncate", !item.isRead ? "font-bold text-primary" : "")}>
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground leading-normal break-words whitespace-normal">
                                  {item.message}
                                </p>
                                <p className="text-[9px] text-muted-foreground/80 mt-1">
                                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 w-full">
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

      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300" 
            onClick={() => setSelectedNotification(null)}
          />
          
          {/* Dialog Content */}
          <div className="bg-card border border-border/60 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 flex flex-col p-6 animate-in zoom-in-95 duration-200 text-left">
            <button
              onClick={() => setSelectedNotification(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Header */}
            <div className="flex items-center gap-4 mb-4">
              {(() => {
                let Icon = Info;
                let iconClass = "text-blue-500 bg-blue-500/10";
                let typeLabel = "System Info";
                if (selectedNotification.type === 'gift') {
                  Icon = Gift;
                  iconClass = "text-emerald-500 bg-emerald-500/10";
                  typeLabel = "Credits Gifted";
                } else if (selectedNotification.type === 'alert') {
                  Icon = AlertTriangle;
                  iconClass = "text-red-500 bg-red-500/10";
                  typeLabel = "Alert";
                } else if (selectedNotification.type === 'news') {
                  Icon = Megaphone;
                  iconClass = "text-indigo-500 bg-indigo-500/10";
                  typeLabel = "Announcement";
                }
                return (
                  <>
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", iconClass)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full", iconClass)}>
                        {typeLabel}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(selectedNotification.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })} • {new Date(selectedNotification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-foreground mb-2 leading-snug">
              {selectedNotification.title}
            </h3>

            {/* Message Body */}
            <div className="text-sm text-muted-foreground leading-relaxed overflow-y-auto max-h-60 whitespace-pre-wrap pr-1">
              {selectedNotification.message}
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setSelectedNotification(null)}
                className="rounded-xl px-5 py-2 text-sm font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
