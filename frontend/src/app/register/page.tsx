"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Calendar, Phone, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from 'next/image';
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";

export default function RegisterPage() {
  const [step, setStep] = useState<"register" | "otp">("register");
  
  // Registration fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP field
  const [otp, setOtp] = useState("");
  
  // Global auth store & router
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const login = useAuthStore((state: any) => state.login);

  const handleGoogleLogin = () => {
    const backendUrl = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://api-permitiq.codealgo.live';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please double-check.");
      return;
    }
    if (!agreeToTerms) {
      setError("You must agree to the Terms and Conditions and Privacy Policy to register.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/auth/register-send-otp", { email });
      setSuccess(response.data.message);
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to send verification OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/register", {
        name,
        email,
        password,
        dob,
        phone,
        otp
      });

      if (response.data && response.data.id) {
        const userData = {
          id: response.data.id,
          name: response.data.name,
          email: response.data.email,
          role: response.data.role
        };
        login(userData);
        toast.success("Account created successfully!");
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || "Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute -top-1/3 -left-1/3 w-[60%] h-[60%] rounded-full bg-primary/5 blur-[160px]" />
      <div className="absolute -bottom-1/3 -right-1/3 w-[60%] h-[60%] rounded-full bg-accent/5 blur-[160px]" />

      <Card className="w-full max-w-md shadow-2xl border-border/40 relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <Link href="/" className="flex items-center gap-2.5 justify-center group">
            <Image src="/logo.png" alt="NYC House Code Logo" width={32} height={32} className="w-8 h-8 object-contain rounded-md" priority={true} />
            <span className="text-xl font-bold text-foreground">NYC House Code</span>
          </Link>
          <div>
            <CardTitle className="text-2xl font-extrabold">
              {step === "register" ? "Create Account" : "Verify Email"}
            </CardTitle>
            <CardDescription>
              {step === "register"
                ? "Start automating your architectural compliance."
                : `We sent a 6-digit verification code to ${email}`}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm font-medium animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {step === "register" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* SSO Buttons */}
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

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      required
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

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
                  <label className="text-sm font-semibold">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      required
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      required
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="pl-10 text-muted-foreground focus:text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Password</label>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      required
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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

                <Button type="submit" disabled={loading} className="w-full shadow-lg shadow-primary/20 mt-2" size="lg">
                  {loading ? (
                    <span className="animate-pulse">Sending OTP...</span>
                  ) : (
                    <>
                      Verify Email & Sign Up
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2 text-center">
                <label className="text-sm font-semibold">Enter 6-Digit Code</label>
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

              <Button type="submit" disabled={loading} className="w-full shadow-lg shadow-primary/20" size="lg">
                {loading ? <span className="animate-pulse">Verifying...</span> : <>Verify & Complete Sign Up <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
              <button 
                type="button" 
                onClick={handleSendOtp} 
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
              >
                Resend Code
              </button>
              <button 
                type="button" 
                onClick={() => setStep("register")} 
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Change Email / Details
              </button>
            </form>
          )}

          {step === "register" && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
