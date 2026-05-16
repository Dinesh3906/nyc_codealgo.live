"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { 
  ArrowLeft, Download, Share2, CheckCircle2, AlertTriangle, 
  ShieldCheck, Zap, Lightbulb, FileText, Activity
} from "lucide-react";
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

      // PAGE 1: COVER
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, pageWidth, 60, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(26);
      doc.setFont('helvetica', 'bold');
      doc.text("FORENSIC COMPLIANCE AUDIT", 20, 35);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
      doc.text("NYC HOUSE CODE AI COMPLIANCE ENGINE", 20, 45);
      doc.text(new Date(plan.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - 20, 45, { align: 'right' });

      let currentY = 80;
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text("Executive Overview", 20, currentY);
      
      const score = analysisResult.score || analysisResult.percentage || 0;
      const scoreBoxW = 70;
      const scoreBoxX = pageWidth - 20 - scoreBoxW;
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(scoreBoxX, currentY - 5, scoreBoxW, 50, 5, 5, 'FD');
      
      let scoreColor = colors.compliant;
      let statusText = "PASS";
      if (score < 70) { scoreColor = colors.major; statusText = "REQUIRES REVISION"; }
      if (score < 40) { scoreColor = colors.critical; statusText = "CRITICAL FAIL"; }
      
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score}%`, scoreBoxX + (scoreBoxW / 2), currentY + 18, { align: 'center' });
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setFontSize(10);
      doc.text("COMPLIANCE SCORE", scoreBoxX + (scoreBoxW / 2), currentY + 30, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.text(statusText, scoreBoxX + (scoreBoxW / 2), currentY + 38, { align: 'center' });

      const buildingInfo = analysisResult.building_info || {};
      const metadata = [
        ["Project File:", plan.fileName],
        ["Audit ID:", plan.id?.substring(0, 8).toUpperCase() || "N/A"],
        ["Occupancy:", buildingInfo.type || "Not Detected"],
        ["Rooms Detected:", (buildingInfo.rooms?.length || "0") + " Habitable Spaces"]
      ];

      let metaY = currentY + 12;
      metadata.forEach(([label, value]) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text(label, 20, metaY);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        
        // Wrap value to prevent overlapping with the score box
        const maxWidth = scoreBoxX - 65; 
        const wrappedValue = doc.splitTextToSize(String(value), maxWidth);
        doc.text(wrappedValue, 65, metaY);
        
        // Increase Y based on number of lines in wrapped value
        metaY += (wrappedValue.length * 5) + 3;
      });

      currentY = 135;
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.line(20, currentY - 5, pageWidth - 20, currentY - 5);
      
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Forensic Summary", 20, currentY);
      currentY += 10;

      const summary = Array.isArray(analysisResult.summary) ? analysisResult.summary.join('\n') : (analysisResult.summary || "No summary available.");
      const summaryLines = summary.split('\n').map(l => l.trim().replace(/^[-•]\s*/, '')).filter(l => l);
      
      doc.setFontSize(10);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      summaryLines.forEach((line) => {
        const splitLine = doc.splitTextToSize(`• ${line}`, pageWidth - 45);
        if (currentY + (splitLine.length * 5) > pageHeight - 30) { doc.addPage(); currentY = 25; }
        doc.text(splitLine, 25, currentY);
        currentY += (splitLine.length * 5) + 3;
      });

      // PAGE 2: POSITIVE FINDINGS
      if (analysisResult.compliant_features && analysisResult.compliant_features.length > 0) {
        doc.addPage();
        currentY = 25;
        doc.setFillColor(colors.compliantBg[0], colors.compliantBg[1], colors.compliantBg[2]);
        doc.roundedRect(20, currentY, pageWidth - 40, 12, 3, 3, 'F');
        doc.setTextColor(colors.compliant[0], colors.compliant[1], colors.compliant[2]);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("✓ POSITIVE FINDINGS & COMPLIANT FEATURES", 25, currentY + 8);
        currentY += 20;

        analysisResult.compliant_features.forEach((f: string) => {
          const sf = doc.splitTextToSize(`✓ ${f}`, pageWidth - 50);
          if (currentY + (sf.length * 5) > pageHeight - 30) { doc.addPage(); currentY = 25; }
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(sf, 25, currentY);
          currentY += (sf.length * 5) + 5;
        });
        currentY += 10;
      }

      // PAGE 3: HUMAN TOUCH (Appreciation)
      if (analysisResult.appreciation) {
        doc.addPage();
        currentY = 30;
        
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(20, currentY, pageWidth - 40, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("EXAMINER'S CONCLUDING APPRECIATION", pageWidth / 2, currentY + 10, { align: 'center' });
        currentY += 15;

        // Handle appreciation as either string or array
        let rawAppreciation = analysisResult.appreciation || "";
        let appLines: string[] = [];
        
        if (Array.isArray(rawAppreciation)) {
          appLines = rawAppreciation;
        } else {
          // Robust splitting for string blocks: split by bullets, numbers, or double newlines
          appLines = String(rawAppreciation)
            .split(/(?:^|\n)(?:[•\-\*\d\.]+\s*|✦\s*)/) 
            .filter(l => l.trim().length > 5);
          
          if (appLines.length <= 1) {
            // Fallback for single block text - split by sentences if no bullets found
            appLines = String(rawAppreciation).split(/[.!?]+\s+/).filter(l => l.trim().length > 10);
          }
        }

        // Sanitizer: Remove weird AI artifacts and leading garbage
        const cleanPoints = appLines.map((p: string) => 
          p.trim()
           .replace(/^[^a-zA-Z0-9✦•\-\*]+/, '') // Remove all non-alphanumeric garbage at start
           .replace(/\s+/g, ' ')                // Clean up extra spaces
        ).filter((p: string) => p.length > 5);

        autoTableModule.default(doc, {
          startY: currentY,
          head: [],
          body: cleanPoints.map(p => [`✦ ${p}`]),
          theme: 'plain',
          styles: { 
            fontSize: 9.5, 
            cellPadding: 6,
            textColor: [44, 62, 80],
            font: 'helvetica',
            fontStyle: 'normal',
            lineColor: [245, 247, 250],
            lineWidth: 0
          },
          bodyStyles: {
            fillColor: [245, 247, 250],
            overflow: 'linebreak' // Ensure wrapping
          },
          columnStyles: { 0: { cellWidth: pageWidth - 50 } }, // Slightly narrower to be safe
          margin: { left: 25, right: 25, top: 30, bottom: 40 }
        });

        const lastAppTable = (doc as any).lastAutoTable;
        currentY = (lastAppTable && lastAppTable.finalY) ? lastAppTable.finalY + 15 : currentY + 100;

        // Check if we need a new page for the signature
        if (currentY > pageHeight - 60) {
          doc.addPage();
          currentY = 30;
        }

        // Digital Signature Look
        doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2], 0.3);
        doc.line(20, currentY, 80, currentY);
        doc.setFontSize(8);
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
        doc.text("Senior AI Plan Examiner #8842", 20, currentY + 5);
        currentY += 10;
      }

      // DETAILED FINDINGS TABLE
      if (analysisResult.issues && analysisResult.issues.length > 0) {
        doc.addPage();
        currentY = 30; // Move down to avoid header
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Code Compliance Violations", 20, currentY);
        currentY += 10;
        
        autoTableModule.default(doc, {
          startY: currentY + 10,
          margin: { top: 30 }, // Safe margin for multi-page tables
          head: [['Issue', 'Severity', 'NYC Code Ref.', 'Action Required']],
          body: analysisResult.issues.map((i: any) => [i.title, i.severity.toUpperCase(), i.rule || i.code || 'N/A', i.recommendation || i.description]),
          theme: 'grid',
          headStyles: { fillColor: colors.primary as [number, number, number], fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 5 },
          columnStyles: { 1: { cellWidth: 25 }, 2: { cellWidth: 35 } },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 1) {
              const severity = data.cell.raw;
              let bgColor = colors.minorBg;
              let txtColor = colors.minor;
              if (severity === 'CRITICAL') { bgColor = colors.criticalBg; txtColor = colors.critical; }
              else if (severity === 'MAJOR') { bgColor = colors.majorBg; txtColor = colors.major; }
              doc.setFillColor(255, 255, 255);
              doc.rect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, 'F');
              drawBadge(severity, data.cell.x + 2, data.cell.y + 2, 21, 6, bgColor, txtColor);
            }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // BETTERMENTS
      if (analysisResult.betterments && analysisResult.betterments.length > 0) {
        if (currentY > pageHeight - 60) { doc.addPage(); currentY = 25; }
        doc.setFillColor(colors.compliantBg[0], colors.compliantBg[1], colors.compliantBg[2]);
        doc.roundedRect(20, currentY, pageWidth - 40, 10, 2, 2, 'F');
        doc.setTextColor(colors.compliant[0], colors.compliant[1], colors.compliant[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("VALUE-ADD ARCHITECTURAL BETTERMENTS", 25, currentY + 7);
        currentY += 18;

        analysisResult.betterments.forEach((b: string) => {
          const splitB = doc.splitTextToSize(`> ${b.replace(/^Betterment \d+:\s*/, '')}`, pageWidth - 50);
          if (currentY + (splitB.length * 5) > pageHeight - 30) { doc.addPage(); currentY = 25; }
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          doc.text(splitB, 25, currentY);
          currentY += (splitB.length * 5) + 5;
        });
      }

      // SAFETY SYSTEMS VERIFICATION
      if (analysisResult.systems_detected && analysisResult.systems_detected.length > 0) {
        if (currentY > pageHeight - 60) { doc.addPage(); currentY = 30; }
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Structural & Mechanical Rooms Detected", 20, currentY);
        currentY += 10;
        
        autoTableModule.default(doc, {
          startY: currentY + 10,
          margin: { top: 30 },
          head: [['Room Name', 'Dimensions / Label', 'Code Classification']],
          body: analysisResult.systems_detected.map((s: string) => [s, "VERIFIED PRESENT"]),
          theme: 'striped',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [240, 240, 240], textColor: colors.primary as [number, number, number] }
        });
      }

      doc.save(`Forensic_Audit_${plan.fileName.split('.')[0]}.pdf`);
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
      <div className="flex items-center justify-center min-h-[60vh] bg-slate-900 text-white">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500" />
          <h2 className="text-2xl font-bold">Audit Not Found</h2>
          <Button onClick={() => router.push('/dashboard/plans')} variant="outline">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const analysisResult = plan.analysisResult || {};

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => router.push('/dashboard/plans')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700" onClick={handleShare}>
              {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" /> : <Share2 className="w-4 h-4 mr-2" />}
              {copied ? "Link Copied" : "Share"}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Generate PDF Audit
            </Button>
          </div>
        </div>

        {/* Header Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1">PRO AUDIT</Badge>
                    <CardTitle className="text-3xl font-bold text-white">{plan.fileName}</CardTitle>
                  </div>
                  <CardDescription className="text-slate-400 flex items-center gap-2 mt-2">
                    <Activity className="w-4 h-4" />
                    Forensic AI analysis completed on {new Date(plan.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-slate-800/40 backdrop-blur-md border-slate-700/50 flex flex-col items-center justify-center p-6 text-center shadow-xl">
            <div className="text-5xl font-black text-blue-400 mb-1">{analysisResult.percentage || analysisResult.score || 0}%</div>
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Compliance Score</p>
          </Card>
        </div>

        {/* Human Touch Appreciation */}
        {analysisResult.appreciation && (
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-blue-500/20 shadow-2xl overflow-hidden relative">
            <div className="absolute top-2 right-2 opacity-10 pointer-events-none">
              <ShieldCheck className="w-24 h-24 text-blue-400" />
            </div>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-white">
                <Zap className="w-5 h-5 text-yellow-400" />
                Senior Examiner's Appreciation
              </CardTitle>
              <CardDescription className="text-slate-400">Professional architectural review and highlights</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const raw = analysisResult.appreciation;
                  let points: string[] = [];
                  if (Array.isArray(raw)) {
                    points = raw;
                  } else if (typeof raw === 'string') {
                    // Robust splitting: split by bullets, numbers, or sentences
                    points = raw.split(/(?:^|\n)(?:[•\-\*\d\.]+\s*|✦\s*)/).filter(l => l.trim().length > 5);
                    if (points.length <= 1) {
                      points = raw.split(/[.!?]+\s+/).filter(l => l.trim().length > 10);
                    }
                  }
                  
                  // Final clean up of each point
                  const cleanPoints = points.map(p => p.trim().replace(/^['"&✦•\-\*\s]+/, '')).filter(p => p.length > 0);
                  
                  if (cleanPoints.length === 0) return null;
                  
                  return cleanPoints.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-700/50">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-300 leading-relaxed">{point}</p>
                    </li>
                  ));
                })()}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {/* Forensic Summary */}
            <Card className="bg-slate-800/30 backdrop-blur-lg border-slate-700/50 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Forensic Compliance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  <ul className="space-y-4">
                    {(Array.isArray(analysisResult.summary) ? analysisResult.summary.join('\n') : (analysisResult.summary || "No summary available."))
                      .split('\n')
                      .filter(l => l.trim())
                      .map((line, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                          <p>{line.replace(/^[-•]\s*/, '').replace(/\*\*/g, '')}</p>
                        </li>
                      ))
                    }
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Compliant Features Section */}
            {analysisResult.compliant_features && analysisResult.compliant_features.length > 0 && (
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                    Compliant Features & Positive Findings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(analysisResult.compliant_features || []).map((feature: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-emerald-500/10">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Identified Issues */}
            <Card className="bg-slate-800/40 backdrop-blur-md border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Code Compliance Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!analysisResult.issues || analysisResult.issues.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
                    <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-emerald-500/50" />
                    <p className="text-lg font-bold text-white">Zero Violations Detected</p>
                    <p className="text-slate-500 text-sm mt-1">This plan fully adheres to the 2022 NYC Building Code</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analysisResult.issues.map((issue: any, i: number) => (
                      <Card key={i} className="bg-slate-900/60 border-slate-700 border-l-4 border-l-red-500 transition-all hover:bg-slate-900">
                        <CardHeader className="py-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-white text-base">{issue.title}</CardTitle>
                              <Badge className="bg-slate-800 text-slate-400 font-mono text-[10px] py-0 border-slate-700">{issue.rule || issue.code || 'CODE: N/A'}</Badge>
                            </div>
                            <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'} className="uppercase text-[10px] tracking-widest">
                              {issue.severity}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <p className="text-slate-400 text-sm leading-relaxed mb-4">{issue.description}</p>
                          {(issue.suggestion || issue.recommendation) && (
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                              <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Required Correction</p>
                              <p className="text-slate-300 text-sm">{issue.suggestion || issue.recommendation}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            {/* Building Info / Rooms */}
            {analysisResult.building_info?.rooms && analysisResult.building_info.rooms.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">Detected Habitable Spaces</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysisResult.building_info.rooms.map((room: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-900/40 border border-slate-700/50">
                        <span className="text-sm text-slate-300 font-medium">{room.name}</span>
                        <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">{room.dimensions || 'Dimensions Detected'}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Issue Breakdown */}
            <Card className="bg-slate-800/50 border-slate-700 shadow-xl">
              <CardHeader><CardTitle className="text-white text-base">Issue Distribution</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-sm text-slate-400">Critical Hazards</span>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/20">{(analysisResult.issues || []).filter((i: any) => i.severity === 'critical').length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-sm text-slate-400">Major Violations</span>
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/20">{(analysisResult.issues || []).filter((i: any) => i.severity === 'major').length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-sm text-slate-400">Minor Adherences</span>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/20">{(analysisResult.issues || []).filter((i: any) => i.severity === 'minor').length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Value Betterments */}
            {analysisResult.betterments && analysisResult.betterments.length > 0 && (
              <Card className="bg-slate-800 border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-400" />
                    Betterments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(analysisResult.betterments || []).map((b: string, i: number) => (
                    <div key={i} className="text-xs text-slate-400 leading-relaxed border-b border-slate-700 pb-3 last:border-0 last:pb-0">
                      <span className="text-emerald-500 font-bold mr-2">✦</span>
                      {b.replace(/^Betterment \d+:\s*/, '')}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Safety Systems Verified */}
            {analysisResult.systems_detected && analysisResult.systems_detected.length > 0 && (
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader><CardTitle className="text-slate-300 text-xs uppercase tracking-widest">Systems Verified</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {analysisResult.systems_detected.map((s: string, i: number) => (
                    <Badge key={i} className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">{s}</Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
