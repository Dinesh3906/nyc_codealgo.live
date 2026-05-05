"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const login = useAuthStore((state: any) => state.login);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("NYC_HOUSE_CODE_REMEMBERED_EMAIL");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute -top-1/3 -right-1/3 w-[60%] h-[60%] rounded-full bg-primary/5 blur-[160px]" />
      <div className="absolute -bottom-1/3 -left-1/3 w-[60%] h-[60%] rounded-full bg-accent/5 blur-[160px]" />

      <Card className="w-full max-w-md shadow-2xl border-border/40 relative z-10">
        <CardHeader className="space-y-4 text-center">
          <Link href="/" className="flex items-center gap-2.5 justify-center group">
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-1.5 shadow-md shadow-primary/20">
              <Hexagon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">NYC House Code</span>
          </Link>
          <div>
            <CardTitle className="text-2xl font-extrabold">Welcome Back</CardTitle>
            <CardDescription>Log in to manage your plan compliance.</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
                <a href="#" className="text-sm text-primary hover:underline font-medium">Forgot?</a>
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
                className="w-4 h-4 rounded border-input accent-primary"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Remember me
              </label>
            </div>

            <Button disabled={loading} className="w-full shadow-lg shadow-primary/20" size="lg">
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account? <Link href="/register" className="text-primary font-semibold hover:underline">Register for free</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
