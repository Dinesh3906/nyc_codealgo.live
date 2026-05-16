"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { ArrowLeft, Download, Share2, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "react-hot-toast";

export default function PlanDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await api.get(`/plans/${id}`);
        let planData = res.data;
        
        // Deep-parse analysisResult to handle any serialization format
        if (planData && planData.analysisResult) {
          let result = planData.analysisResult;
          let depth = 0;
          while (typeof result === 'string' && depth < 5) {
            try { result = JSON.parse(result); } catch { break; }
            depth++;
          }
          if (typeof result !== 'object' || result === null) result = {};
          planData.analysisResult = result;
        }
        
        setPlan(planData);
      } catch (err) {
        console.error("Fetch plan failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [id]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!plan?.analysisResult) return;

    Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]).then(async ([jsPDFModule, autoTableModule]) => {
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const analysisResult = plan.analysisResult;
      
      const colors = {
        primary: [15, 23, 42],
        secondary: [51, 65, 85],
        text: [71, 85, 105],
        lightText: [148, 163, 184],
        border: [226, 232, 240],
        bgLight: [248, 250, 252],
        critical: [220, 38, 38],
        criticalBg: [254, 226, 226],
        major: [217, 119, 6],
        majorBg: [254, 243, 199],
        minor: [37, 99, 235],
        minorBg: [219, 234, 254],
        compliant: [5, 150, 105],
        compliantBg: [209, 250, 229]
      };

      const drawBadge = (text: string, x: number, y: number, w: number, h: number, bgColor: number[], textColor: number[]) => {
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.roundedRect(x, y, w, h, 3, 3, 'F');
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(text, x + (w / 2), y + (h / 2) + 1.2, { align: 'center', baseline: 'middle' });
      };

      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, pageWidth, 55, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text("FORENSIC COMPLIANCE AUDIT", 20, 32);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
      doc.text("NYC HOUSE CODE AI COMPLIANCE ENGINE", 20, 42);
      doc.text(new Date(plan.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - 20, 42, { align: 'right' });

      let currentY = 75;
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("Project Overview", 20, currentY);
      
      const score = analysisResult.score || analysisResult.percentage || 0;
      const scoreBoxW = 65;
      const scoreBoxX = pageWidth - 20 - scoreBoxW;
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(scoreBoxX, currentY - 5, scoreBoxW, 45, 4, 4, 'FD');
      
      let scoreColor = colors.compliant;
      let statusText = "PASS";
      if (score < 70) { scoreColor = colors.major; statusText = "REQUIRES REVISION"; }
      if (score < 40) { scoreColor = colors.critical; statusText = "CRITICAL FAIL"; }
      
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score}%`, scoreBoxX + (scoreBoxW / 2), currentY + 16, { align: 'center' });
      
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("COMPLIANCE SCORE", scoreBoxX + (scoreBoxW / 2), currentY + 26, { align: 'center' });
      
      const buildingInfo = analysisResult.building_info || {};
      const metadata = [
        ["Project:", plan.fileName],
        ["Document ID:", plan.id?.substring(0, 8).toUpperCase() || "N/A"],
        ["Occupancy Group:", buildingInfo.occupancy_group || "Not Detected"],
        ["Construction Type:", buildingInfo.construction_type || "Not Detected"],
        ["Floor Count:", buildingInfo.stories || "Unknown"]
      ];

      let metaY = currentY + 10;
      metadata.forEach(([label, value]) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text(label, 20, metaY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text(value, 65, metaY);
        metaY += 7;
      });

      currentY = 130;
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Executive Summary", 20, currentY);
      currentY += 10;

      const rawSummary = Array.isArray(analysisResult.summary) ? analysisResult.summary.join('\n') : (analysisResult.summary || "No summary available.");
      const summaryLines = rawSummary.replace(/\*\*/g, '').split('\n').filter(l => l.trim());
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      
      summaryLines.forEach((line) => {
        const splitLine = doc.splitTextToSize(`• ${line}`, pageWidth - 40);
        if (currentY + (splitLine.length * 5) > pageHeight - 20) { doc.addPage(); currentY = 20; }
        doc.text(splitLine, 20, currentY);
        currentY += (splitLine.length * 5) + 2;
      });

      if (analysisResult.issues && analysisResult.issues.length > 0) {
        doc.addPage();
        currentY = 20;
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Detailed Findings", 20, currentY);
        currentY += 10;

        autoTableModule.default(doc, {
          startY: currentY,
          head: [['Issue', 'Severity', 'Rule', 'Recommendation']],
          body: analysisResult.issues.map((i: any) => [i.title, i.severity.toUpperCase(), i.rule || 'N/A', i.recommendation || i.description]),
          theme: 'grid',
          headStyles: { fillColor: colors.primary as [number, number, number] },
          styles: { fontSize: 8 },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 1) {
              const severity = data.cell.raw;
              let bgColor = colors.minorBg;
              let txtColor = colors.minor;
              if (severity === 'CRITICAL') { bgColor = colors.criticalBg; txtColor = colors.critical; }
              else if (severity === 'MAJOR') { bgColor = colors.majorBg; txtColor = colors.major; }
              doc.setFillColor(255, 255, 255);
              doc.rect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, 'F');
              drawBadge(severity, data.cell.x + 2, data.cell.y + 2, 20, 5, bgColor, txtColor);
            }
          }
        });
      }

      doc.save(`Compliance_Report_${plan.fileName}.pdf`);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 lg:p-12 space-y-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <Skeleton className="h-12 w-64 bg-slate-800" />
              <Skeleton className="h-4 w-96 bg-slate-800" />
            </div>
            <Skeleton className="h-10 w-32 bg-slate-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Skeleton className="h-32 w-full bg-slate-800" />
            <Skeleton className="h-32 w-full bg-slate-800" />
            <Skeleton className="h-32 w-full bg-slate-800" />
            <Skeleton className="h-32 w-full bg-slate-800" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-[600px] w-full bg-slate-800" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-96 w-full bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
          <h2 className="text-xl font-bold">Plan Not Found</h2>
          <Button onClick={() => router.push('/dashboard/plans')}>Back to Plans</Button>
        </div>
      </div>
    );
  }

  const { analysisResult } = plan;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/dashboard/plans')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Plans
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleShare}>
            {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Share"}
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{plan.fileName}</CardTitle>
              <CardDescription>Analyzed on {new Date(plan.createdAt).toLocaleDateString()}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">{analysisResult.percentage || analysisResult.score || 0}%</div>
              <p className="text-sm text-muted-foreground">Compliance Score</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Executive Summary</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground leading-relaxed">
              {(Array.isArray(analysisResult.summary) ? analysisResult.summary.join('\n') : (analysisResult.summary || "No summary available."))
                .split('\n')
                .filter(l => l.trim())
                .map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{line.replace(/\*\*/g, '')}</span>
                  </li>
                ))
              }
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Issue Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Critical</span>
              <Badge variant="destructive">{(analysisResult.issues || []).filter((i: any) => i.severity === 'critical').length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Major</span>
              <Badge variant="secondary">{(analysisResult.issues || []).filter((i: any) => i.severity === 'major').length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Minor</span>
              <Badge variant="outline">{(analysisResult.issues || []).filter((i: any) => i.severity === 'minor').length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identified Issues</CardTitle>
          <CardDescription>{analysisResult.issues?.length || 0} issue(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {!analysisResult.issues || analysisResult.issues.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium">No Issues Identified</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analysisResult.issues.map((issue: any, i: number) => (
                <Card key={i} className="border-l-4 border-l-destructive">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{issue.title}</CardTitle>
                        <CardDescription>Code: {issue.rule || issue.code || 'N/A'}</CardDescription>
                      </div>
                      <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}>{issue.severity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent><p className="text-muted-foreground">{issue.description || issue.recommendation}</p></CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
