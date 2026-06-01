"use client";
 
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import api from "@/lib/api";
import { 
  MessageSquare, 
  ChevronLeft, 
  ShieldAlert, 
  Loader2, 
  RefreshCcw,
  User,
  Calendar,
  AlertCircle,
  ExternalLink,
  Image as ImageIcon
} from "lucide-react";
import Image from "next/image";
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

interface Feedback {
  id: string;
  userName: string;
  userEmail: string;
  type: string;
  subject: string;
  message: string;
  createdAt: string;
}

export default function AdminFeedbackPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === 'chalams115@gmail.com';
  // Hardcode the production backend URL for images to be safe against relative path issues
  const backendUrl = 'https://api.codealgo.live';

  useEffect(() => {
    if (hasHydrated && (!isAuthenticated || !isAdmin)) {
      toast.error("Unauthorized access");
      router.push("/dashboard");
    }
  }, [hasHydrated, isAuthenticated, isAdmin, router]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const response = await api.get("/feedback");
      setFeedbacks(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load feedbacks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchFeedbacks();
    }
  }, [isAuthenticated, isAdmin]);

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-10" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="border rounded-lg p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <MessageSquare className="w-10 h-10 text-primary" />
              Admin Feedback Center
            </h1>
            <p className="text-muted-foreground">View and manage all user complaints and suggestions</p>
          </div>
          <Button onClick={fetchFeedbacks} variant="outline" size="icon">
            <RefreshCcw className={`w-4 h-4 ${loading ? 'opacity-50' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription>Total Submissions</CardDescription>
              <CardTitle className="text-3xl">{feedbacks.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Complaints</CardDescription>
              <CardTitle className="text-3xl text-red-500">
                {feedbacks.filter(f => f.type === 'complaint').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Feature Requests</CardDescription>
              <CardTitle className="text-3xl text-blue-500">
                {feedbacks.filter(f => f.type === 'feature').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Proofs</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ShieldAlert className="w-8 h-8 opacity-20" />
                      <p>No feedbacks received yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                feedbacks.map((fb) => (
                  <TableRow key={fb.id} className="group cursor-default">
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium">{fb.userName}</p>
                        <p className="text-xs text-muted-foreground">{fb.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={fb.type === 'complaint' ? 'destructive' : 'secondary'}
                        className="capitalize"
                      >
                        {fb.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{fb.subject}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm line-clamp-2 text-muted-foreground group-hover:line-clamp-none transition-all">
                        {fb.message}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2 overflow-hidden">
                        {(fb as any).images && (fb as any).images.map((img: string, idx: number) => {
                          const cleanPath = img.startsWith('/') ? img : `/${img}`;
                          const fullUrl = `https://api.codealgo.live${cleanPath}`;
                          return (
                            <a 
                              key={idx} 
                              href={fullUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="relative group/img"
                            >
                              <Image 
                                src={fullUrl} 
                                alt="NYC Building Code Violation Proof Screenshot" 
                                width={32}
                                height={32}
                                className="inline-block h-8 w-8 rounded-lg ring-2 ring-background object-cover hover:scale-110 transition-transform cursor-pointer" 
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                                <ExternalLink className="w-3 h-3 text-white" />
                              </div>
                            </a>
                          );
                        })}
                        {(!(fb as any).images || (fb as any).images.length === 0) && (
                          <span className="text-xs text-muted-foreground italic">No proofs</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground text-nowrap">
                      {new Date(fb.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
