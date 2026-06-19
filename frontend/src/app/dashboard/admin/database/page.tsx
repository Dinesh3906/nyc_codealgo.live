"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import api from "@/lib/api";
import {
  Database,
  ShieldCheck,
  Mail,
  Gift,
  Search,
  Loader2,
  RefreshCcw,
  User,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Coins
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  provider: string;
  scanLimit: number;
  pagesUsed: number;
  createdAt: string;
}

export default function AdminDatabasePage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // OTP Session Authentication States
  const [isVerified, setIsVerified] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  // Gifting Dialog States
  const [giftingUser, setGiftingUser] = useState<UserRecord | null>(null);
  const [giftPagesAmount, setGiftPagesAmount] = useState<string>("10");
  const [giftingInProgress, setGiftingInProgress] = useState(false);

  // Broadcast Announcement States
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState("news");
  const [broadcasting, setBroadcasting] = useState(false);

  const isAdmin = user?.email === 'chalams115@gmail.com' || user?.email === 'sathvi2018@gmail.com';

  // 1. Initial Authorization Verification
  useEffect(() => {
    if (hasHydrated) {
      if (!isAuthenticated || !isAdmin) {
        toast.error("Unauthorized access restricted.");
        router.push("/dashboard");
        return;
      }
      
      // Check for cached admin OTP session token (valid for 2 hours)
      const cachedToken = sessionStorage.getItem("codealgo-admin-otp-token");
      if (cachedToken) {
        setAdminToken(cachedToken);
        setIsVerified(true);
      } else {
        // Automatically request security OTP on page enter
        triggerSendOtp();
      }
    }
  }, [hasHydrated, isAuthenticated, isAdmin, router]);

  // 2. Fetch Users Directory once OTP is verified
  const fetchUsers = async (tokenOverride?: string) => {
    const activeToken = tokenOverride || adminToken;
    if (!activeToken) return;
    
    setLoading(true);
    try {
      const response = await api.get("/admin/users", {
        headers: { "X-Admin-Token": activeToken }
      });
      setUsersList(response.data);
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error("Admin session expired. Please verify OTP again.");
        sessionStorage.removeItem("codealgo-admin-otp-token");
        setAdminToken(null);
        setIsVerified(false);
      } else {
        toast.error(error.response?.data?.message || "Failed to retrieve user directory.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVerified && adminToken) {
      fetchUsers();
    }
  }, [isVerified, adminToken]);

  // 3. Cooldown timer for OTP Resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const triggerSendOtp = async () => {
    if (otpSending || cooldown > 0) return;
    
    setOtpSending(true);
    try {
      const res = await api.post("/admin/send-otp");
      toast.success(res.data.message || "OTP code sent to your admin email.");
      setCooldown(30); // 30s resend throttle
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to deliver OTP. Verify SMTP configuration.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpVerifying) return;

    setOtpVerifying(true);
    try {
      const res = await api.post("/admin/verify-otp", { otp: otpCode });
      const receivedToken = res.data.adminSessionToken;
      
      sessionStorage.setItem("codealgo-admin-otp-token", receivedToken);
      setAdminToken(receivedToken);
      setIsVerified(true);
      toast.success("Security authorization complete. Welcome back!");
      fetchUsers(receivedToken);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid verification code.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleGiftPagesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftingUser || giftingInProgress || !adminToken) return;

    const pagesNum = parseInt(giftPagesAmount);
    if (isNaN(pagesNum) || pagesNum <= 0) {
      toast.error("Please enter a valid page amount.");
      return;
    }

    setGiftingInProgress(true);
    try {
      const res = await api.post(
        "/admin/gift-pages",
        { email: giftingUser.email, pages: pagesNum },
        { headers: { "X-Admin-Token": adminToken } }
      );
      
      toast.success(res.data.message || "Pages allocated successfully!");
      setGiftingUser(null);
      setGiftPagesAmount("10");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to allocate pages.");
    } finally {
      setGiftingInProgress(false);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage || broadcasting || !adminToken) return;

    setBroadcasting(true);
    try {
      const res = await api.post(
        "/admin/broadcast-notification",
        { title: broadcastTitle, message: broadcastMessage, type: broadcastType },
        { headers: { "X-Admin-Token": adminToken } }
      );
      toast.success(res.data.message || "System broadcast sent successfully!");
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastType("news");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to publish announcement.");
    } finally {
      setBroadcasting(false);
    }
  };

  // 4. Client side filtering by query
  const filteredUsers = usersList.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Totals calculations
  const totalUsers = usersList.length;
  const totalAllocated = usersList.reduce((acc, curr) => acc + curr.scanLimit, 0);
  const totalUsed = usersList.reduce((acc, curr) => acc + curr.pagesUsed, 0);

  // Render Skeleton Loader for auth validation or list loading
  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // OTP Verification view
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-border/60 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          
          <CardHeader className="text-center pt-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-blue-500" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Security Verification</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Admin authentication required to access sensitive system user databases.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-8">
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Verification Code
                </label>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full bg-background/50 border border-border/80 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={otpVerifying || otpCode.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-6 font-semibold transition-all flex items-center justify-center gap-2"
              >
                {otpVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Authorize Access
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="flex flex-col items-center gap-2 pt-2 border-t border-border/60">
              <p className="text-xs text-muted-foreground">
                We sent a secure One-Time Password to <strong className="text-foreground">{user?.email}</strong>.
              </p>
              <Button
                variant="link"
                disabled={otpSending || cooldown > 0}
                onClick={triggerSendOtp}
                className="text-xs text-blue-500 p-0 h-auto hover:text-blue-400"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <Database className="w-10 h-10 text-blue-500" />
              User Database Panel
            </h1>
            <p className="text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Secure administration session active.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => fetchUsers()} variant="outline" size="icon" className="rounded-xl">
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Aggregates row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-blue-500 font-semibold uppercase tracking-wider text-xs">
                <User className="w-4 h-4" />
                Total Registered Users
              </CardDescription>
              <CardTitle className="text-4xl font-extrabold tracking-tight mt-1">{totalUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-500/5 to-transparent border-indigo-500/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-indigo-500 font-semibold uppercase tracking-wider text-xs">
                <Coins className="w-4 h-4" />
                Total Pages Allocated
              </CardDescription>
              <CardTitle className="text-4xl font-extrabold tracking-tight mt-1">{totalAllocated}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-emerald-500 font-semibold uppercase tracking-wider text-xs">
                <TrendingUp className="w-4 h-4" />
                Total Pages Used
              </CardDescription>
              <CardTitle className="text-4xl font-extrabold tracking-tight mt-1">{totalUsed}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Publish System Announcement / News Broadcast Card */}
        <Card className="border-border/60 bg-card/40 backdrop-blur-xl">
          <CardHeader className="pb-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-indigo-500" />
              <div>
                <CardTitle className="text-lg font-bold">Publish News & System Announcement</CardTitle>
                <CardDescription className="text-xs">Send a dashboard notification to all registered users simultaneously</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleBroadcastSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New NYC Code Database Update Available"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full bg-background border border-border/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Notification Type
                  </label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value)}
                    className="w-full bg-background border border-border/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="news">News / Announcement</option>
                    <option value="update">Software Update</option>
                    <option value="alert">System Alert</option>
                    <option value="info">General Info</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Message Body
                </label>
                <textarea
                  placeholder="Type the notification details here... This will be visible on the user's dashboard notifications dropdown list."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-xl px-4 py-2.5 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={broadcasting || !broadcastTitle || !broadcastMessage}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 flex items-center justify-center gap-1.5 font-semibold text-xs"
                >
                  {broadcasting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    <>
                      Send System Broadcast
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Users list Search and Table */}
        <Card className="border-border/60 bg-card/40 backdrop-blur-xl">
          <div className="p-6 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background/50 border border-border/80 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Showing {filteredUsers.length} of {totalUsers} registered users
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">User Info</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead>Signup Provider</TableHead>
                  <TableHead className="text-center">Pages Limit</TableHead>
                  <TableHead className="text-center">Pages Used</TableHead>
                  <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-8 mx-auto" /></TableCell>
                      <TableCell className="text-right pr-6"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShieldAlert className="w-8 h-8 opacity-20" />
                        <p>No user records matching search query</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.provider === 'google' ? 'default' : 'secondary'}
                          className={`capitalize font-semibold text-[10px] tracking-wide rounded-md px-2.5 py-0.5 ${
                            item.provider === 'google'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20'
                          }`}
                        >
                          {item.provider}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold font-mono">
                        {item.scanLimit}
                      </TableCell>
                      <TableCell className="text-center font-bold font-mono text-muted-foreground">
                        {item.pagesUsed}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          onClick={() => setGiftingUser(item)}
                          variant="ghost"
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold text-xs rounded-xl h-8 gap-1 transition-all"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          Gift Pages
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Gifting Dialog Overlay */}
      {giftingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-card border-border/60 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-500 to-green-500" />
            
            <CardHeader className="pt-6">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <Gift className="w-6 h-6 text-emerald-500" />
              </div>
              <CardTitle className="text-xl font-bold text-center">Gift Free Pages</CardTitle>
              <CardDescription className="text-sm text-muted-foreground text-center mt-1">
                You are gifting free pages to <span className="text-foreground font-semibold font-mono">{giftingUser.email}</span>.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleGiftPagesSubmit}>
              <CardContent className="space-y-4 pb-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Number of pages
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={giftPagesAmount}
                    onChange={(e) => setGiftPagesAmount(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-background border border-border/80 rounded-xl px-4 py-2.5 text-center text-lg font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground text-center leading-normal">
                    This user currently has <span className="font-bold text-foreground font-mono">{giftingUser.scanLimit}</span> pages. After allocation, they will have <span className="font-bold text-foreground font-mono">{giftingUser.scanLimit + (parseInt(giftPagesAmount) || 0)}</span> pages.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setGiftingUser(null)}
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={giftingInProgress || !giftPagesAmount}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5"
                  >
                    {giftingInProgress ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gifting...
                      </>
                    ) : (
                      <>
                        Confirm Gift
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
