"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const login = useAuthStore((state: any) => state.login);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/register", {
        name,
        email,
        password
      });

      if (response.data.token) {
        const userData = {
          id: response.data.id,
          name: response.data.name,
          email: response.data.email
        };
        login(userData, response.data.token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || "Registration failed. Try a different email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0b1326] p-6 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-15%] w-[45vw] h-[45vw] rounded-full bg-[#4edea3]/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[35vw] h-[35vw] rounded-full bg-[#b7c8e1]/5 blur-[120px]" />
        <div className="absolute inset-0 cyber-grid" />
      </div>

      <div className="w-full max-w-[420px] relative z-10 animate-fade-in-up">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[#4edea3] font-bold text-lg tracking-tight mb-6">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
            NYC CODES
          </Link>
          <h1 className="text-2xl font-bold text-[#dae2fd] mt-4 font-headline">Create your account</h1>
          <p className="text-sm text-[#bbcabf] mt-1.5">Start automating your architectural compliance</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg p-6 sm:p-8 shadow-xl shadow-black/20">
          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-2.5 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase text-[#bbcabf]">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bbcabf]/50" />
                <input
                  required
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-white/[0.08] bg-[#171f33] pl-10 pr-3 py-2 text-sm text-[#dae2fd] placeholder:text-[#bbcabf]/40 focus:outline-none focus:ring-2 focus:ring-[#4edea3]/30 focus:border-[#4edea3]/40 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase text-[#bbcabf]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bbcabf]/50" />
                <input
                  required
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-white/[0.08] bg-[#171f33] pl-10 pr-3 py-2 text-sm text-[#dae2fd] placeholder:text-[#bbcabf]/40 focus:outline-none focus:ring-2 focus:ring-[#4edea3]/30 focus:border-[#4edea3]/40 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase text-[#bbcabf]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bbcabf]/50" />
                <input
                  required
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-white/[0.08] bg-[#171f33] pl-10 pr-3 py-2 text-sm text-[#dae2fd] placeholder:text-[#bbcabf]/40 focus:outline-none focus:ring-2 focus:ring-[#4edea3]/30 focus:border-[#4edea3]/40 transition-all"
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full h-11 bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] font-bold text-sm tracking-wide rounded-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-[#4edea3]/10 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#003824]/30 border-t-[#003824] rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#bbcabf]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#4edea3] font-semibold hover:text-[#6ffbbe] transition-colors">
              Log in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[#bbcabf]/40 mt-6">
          © 2024 NYC CODES. Deployed in Brooklyn.
        </p>
      </div>
    </main>
  );
}
