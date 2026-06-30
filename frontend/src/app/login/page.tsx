"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const login = useAuthStore((state: any) => state.login);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("NYC_HOUSE_CODE_REMEMBERED_EMAIL");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleGoogleLogin = () => {
    const backendUrl = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://api.permitiq.live';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeToTerms) {
      setError("You must agree to the Terms and Conditions and Privacy Policy to log in.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email,
        password
      });

      if (response.data.token) {
        if (rememberMe) {
          localStorage.setItem("NYC_HOUSE_CODE_REMEMBERED_EMAIL", email);
        } else {
          localStorage.removeItem("NYC_HOUSE_CODE_REMEMBERED_EMAIL");
        }

        const userData = {
          id: response.data.id,
          name: response.data.name,
          email: response.data.email
        };
        login(userData, response.data.token);
        const pendingSessionId = sessionStorage.getItem('nyc-house-code-pending-checkout-session');
        if (pendingSessionId) {
          sessionStorage.removeItem('nyc-house-code-pending-checkout-session');
          router.push(`/dashboard/billing?success=true&session_id=${pendingSessionId}`);
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || "Invalid credentials. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/auth/forgot-password", { email });
      setSuccess(res.data.message);
      setMode("reset");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/reset-password", { email, otp, newPassword });
      setSuccess(res.data.message);
      setMode("login");
      setOtp("");
      setNewPassword("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute -top-1/3 -right-1/3 w-[60%] h-[60%] rounded-full bg-primary/5 blur-[160px]" />
      <div className="absolute -bottom-1/3 -left-1/3 w-[60%] h-[60%] rounded-full bg-accent/5 blur-[160px]" />

      <Card className="w-full max-w-md shadow-2xl border-border/40 relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <Link href="/" className="flex items-center gap-2.5 justify-center group">
            <Image src="/logo.png" alt="PermitIQ ( by Aureon ) NYC Codes Logo" width={32} height={32} className="w-8 h-8 object-contain rounded-md" priority={true} />
            <span className="text-xl font-bold text-foreground">NYC House Code</span>
          </Link>
          <div>
            <CardTitle className="text-2xl font-extrabold">
              {mode === "login" ? "Welcome Back" : mode === "forgot" ? "Forgot Password" : "Reset Password"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Log in to manage your plan compliance."
                : mode === "forgot"
                  ? "Enter your email to receive a verification code."
                  : "Enter the code sent to your email and set a new password."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {(error || success) && (
            <div className={`mb-6 p-3 border rounded-lg flex items-center gap-2 text-sm ${error ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'}`}>
              <AlertCircle className="w-4 h-4" />
              {error || success}
            </div>
          )}

          {mode === "login" && (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleGoogleLogin}
                  className="font-mono text-xs uppercase tracking-wider bg-transparent border border-border/80 hover:bg-muted text-foreground flex items-center justify-center gap-2 rounded-sm w-full"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.445-2.89-6.445-6.445s2.89-6.445 6.445-6.445c1.614 0 3.09.594 4.225 1.574l3.1-3.1C19.29 2.215 15.93 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.84 0 10.965-4.2 10.965-11.24 0-.756-.08-1.464-.225-1.955H12.24z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border/60"></div>
                <span className="flex-shrink mx-4 text-muted-foreground font-mono text-[10px] uppercase tracking-widest">or continue with</span>
                <div className="flex-grow border-t border-border/60"></div>
              </div>
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    required
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Password</label>
                  <button type="button" onClick={() => setMode("forgot")} className="text-sm text-primary hover:underline font-medium">Forgot?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-input accent-primary cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  Remember me
                </label>
              </div>

              <div className="flex items-start space-x-2 pt-1 pb-2">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  required
                  className="w-4 h-4 mt-0.5 rounded border-input accent-primary cursor-pointer"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                />
                <label htmlFor="agreeToTerms" className="text-sm text-muted-foreground cursor-pointer leading-tight">
                  I agree to the{" "}
                  <Link href="/terms-of-service" target="_blank" className="text-primary font-semibold hover:underline">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy-policy" target="_blank" className="text-primary font-semibold hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button disabled={loading} className="w-full shadow-lg shadow-primary/20" size="lg">
                {loading ? <span className="animate-pulse">Signing in...</span> : <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Verification Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    required
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button disabled={loading} className="w-full shadow-lg shadow-primary/20" size="lg">
                {loading ? <span className="animate-pulse">Sending OTP...</span> : <>Send Code <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
              <button type="button" onClick={() => setMode("login")} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
                Back to Login
              </button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleReset} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2 text-center">
                <label className="text-sm font-semibold">Verification Code</label>
                <div className="flex justify-center">
                  <Input
                    required
                    maxLength={6}
                    placeholder="000000"
                    className="w-full max-w-[260px] text-center text-3xl font-mono tracking-[0.4em] h-16 border-2 border-blue-500/30 bg-slate-50/5 dark:bg-slate-900/50 rounded-xl"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                </div>
              </div>

              <Button disabled={loading} className="w-full shadow-lg shadow-primary/20" size="lg">
                {loading ? <span className="animate-pulse">Resetting...</span> : <>Confirm New Password <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
              <button type="button" onClick={() => setMode("forgot")} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
                Resend Code
              </button>
            </form>
          )}

          {mode === "login" && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account? <Link href="/register" className="text-primary font-semibold hover:underline">Register for free</Link>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
