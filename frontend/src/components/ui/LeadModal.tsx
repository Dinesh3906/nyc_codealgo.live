"use client";

import { X, Send, Mail, User, Building, ArrowRight } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LeadModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      await api.post('/api/leads', { name, email, organization: org });
      console.log("Lead captured:", { email, name, org });
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 2000);
    } catch (error) {
      console.error("Failed to submit lead", error);
      setStatus('idle');
      alert("Failed to submit your details. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />

      <Card className="relative w-full max-w-md shadow-2xl">
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader>
          {status === 'success' ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8" />
              </div>
              <CardTitle className="mb-2">You're on the list!</CardTitle>
              <CardDescription>We'll notify you the moment NYC House Code is ready for your first plan.</CardDescription>
            </div>
          ) : (
            <>
              <CardTitle>Get Early Access</CardTitle>
              <CardDescription>Join the waiting list to get instant DOB compliance checks for your next project.</CardDescription>
            </>
          )}
        </CardHeader>

        {status !== 'success' && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  required
                  type="text"
                  placeholder="Firm / Organization"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Button
                disabled={status === 'loading'}
                className="w-full"
                size="lg"
              >
                {status === 'loading' ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Join the Waitlist
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              By joining, you agree to our Terms and Privacy Policy.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
