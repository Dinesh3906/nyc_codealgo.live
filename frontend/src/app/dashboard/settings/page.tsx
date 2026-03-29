"use client";

import { Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Account Updates</CardTitle>
              <CardDescription>Contact support for account changes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            To update your email, password, or other account settings, please contact our support team.
          </p>
          <div className="bg-accent/50 border border-border rounded-lg p-4">
            <p className="text-sm font-medium mb-1">Support Email</p>
            <a 
              href="mailto:support@brickly.com" 
              className="text-primary font-semibold hover:underline"
            >
              support@brickly.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
