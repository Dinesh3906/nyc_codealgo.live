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
import { buildPdfFilename, downloadPdfDocument } from "@/lib/pdfDownload";

export default function PlanDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

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
      doc.text("PERMITIQ AI COMPLIANCE ENGINE", 20, 45);
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
      let statusText = "HIGH ADVISORY SCORE";
      if (score < 70) { scoreColor = colors.major; statusText = "MODERATE ADVISORY SCORE"; }
      if (score < 40) { scoreColor = colors.critical; statusText = "LOW ADVISORY SCORE"; }

      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score}%`, scoreBoxX + (scoreBoxW / 2), currentY + 18, { align: 'center' });
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setFontSize(10);
      doc.text("COMPLIANCE SCORE", scoreBoxX + (scoreBoxW / 2), currentY + 30, { align: 'center' });
      doc.setFontSize(5.5);
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
        if (currentY > pageHeight * 0.6) {
          doc.addPage();
          currentY = 30;
        } else {
          currentY += 15;
        }

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(20, currentY, pageWidth - 40, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("INFORMATIONAL HIGHLIGHTS & ADVISORY COMMENTS", pageWidth / 2, currentY + 10, { align: 'center' });
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

        // Nuclear Sanitizer: Remove ALL leading garbage and fix spaced-out AI text
        const cleanPoints = appLines.map((p: string) => {
          let clean = p.trim();
          // Remove anything at the start that isn't a letter or number (kills "' &", bullets, etc.)
          clean = clean.replace(/^[^a-zA-Z0-9]+/, '');
          // Fix spaced-out AI letters: replace multiple spaces with single space
          clean = clean.replace(/\s{2,}/g, ' ');
          return clean;
        }).filter((p: string) => p.length > 5);

        autoTableModule.default(doc, {
          startY: currentY,
          head: [],
          body: cleanPoints.map(p => [`- ${p}`]), // Use standard dash for maximum compatibility
          theme: 'plain',
          styles: {
            fontSize: 9.5,
            cellPadding: 6,
            textColor: [44, 62, 80],
            font: 'helvetica',
            fontStyle: 'normal',
            halign: 'left'
          },
          bodyStyles: {
            fillColor: [245, 247, 250],
            overflow: 'linebreak'
          },
          columnStyles: { 0: { cellWidth: 155 } }, // Hard-coded safe width
          margin: { left: 25, right: 25, top: 30, bottom: 40 }
        });

        const lastAppTable = (doc as any).lastAutoTable;
        currentY = (lastAppTable && lastAppTable.finalY) ? lastAppTable.finalY + 15 : currentY + 100;

        // Conspicuous Disclaimer Box - Ensure it doesn't float alone on a new page
        const disclaimerBoxHeight = 42;
        if (currentY > pageHeight - disclaimerBoxHeight - 15) {
          doc.addPage();
          currentY = 30;
        }

        // Draw a light grey background box with a thin red border (warning)
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.5);
        doc.roundedRect(20, currentY + 5, pageWidth - 40, disclaimerBoxHeight, 2, 2, 'FD');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // Red text
        doc.text("WARNING: REGULATORY COMPLIANCE & PROFESSIONAL SERVICES DISCLAIMER", 25, currentY + 12);

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // Slate 600 body text
        
        const disclaimerText = [
          "This report is generated by PermitIQ, an AI-powered informational search and reference tool, and is provided strictly 'AS IS' for advisory purposes only. PermitIQ is not a licensed engineering or architectural firm, and this document does not constitute professional design advice or certification. No professional or electronic seal is affixed, and no guarantees of compliance with local safety codes are provided.",
          "All code analysis results, compliance evaluations, dimensions, material selections, and capacity/load calculations must be independently reviewed, verified, and stamped by a New York-licensed Professional Engineer (PE) or Registered Architect (RA) prior to project implementation or formal permit submission to the NYC Department of Buildings (DOB) or any other regulatory body.",
          "PermitIQ takes no position as to whether the design or construction of any building or facility complies with any building, fire, energy, or electrical code. We disclaim all liability for interpretations of local codes, compliance findings, permit rejections, construction delays, or any other outcomes resulting from the use of this report."
        ];

        let disclaimerY = currentY + 16;
        disclaimerText.forEach((paragraph) => {
          const splitParagraph = doc.splitTextToSize(paragraph, pageWidth - 50);
          doc.text(splitParagraph, 25, disclaimerY);
          disclaimerY += (splitParagraph.length * 2.8) + 1;
        });
        currentY += 5 + disclaimerBoxHeight;
      }

      // DETAILED FINDINGS TABLE
      if (analysisResult.issues && analysisResult.issues.length > 0) {
        if (currentY > pageHeight * 0.7) {
          doc.addPage();
          currentY = 30;
        } else {
          currentY += 20;
        }
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Code Compliance Violations", 20, currentY);
        currentY += 10;

        autoTableModule.default(doc, {
          startY: currentY + 10,
          margin: { top: 30 }, // Safe margin for multi-page tables
          head: [['Issue / Penalty', 'Severity', 'NYC Code Citation', 'Loophole & Required Action']],
          body: analysisResult.issues.map((i: any) => {
            const deduction = i.deductionPercentage || i.deduction_percentage || 0;
            const citation = i.exactPdfCitation || i.exact_pdf_citation || 'N/A';
            const loophole = i.loopholeDetails || i.loophole_details || 'N/A';
            const correction = i.suggestion || i.recommendation || i.requiredElements || i.required_elements || 'N/A';
            return [
              `${i.title}\nPenalty: -${deduction}%`,
              String(i.severity || 'minor').toUpperCase(),
              `${i.rule || i.code || 'N/A'}\n\nPDF Ref:\n${citation}`,
              `Loophole:\n${loophole}\n\nRequired Correction:\n${correction}`
            ];
          }),
          theme: 'grid',
          headStyles: { fillColor: colors.primary as [number, number, number], fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 5 },
          columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 22 }, 2: { cellWidth: 45 } },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 1) {
              const severity = data.cell.raw;
              const severityUpper = String(severity || '').toUpperCase();
              let bgColor = colors.minorBg;
              let txtColor = colors.minor;
              if (severityUpper === 'CRITICAL') { bgColor = colors.criticalBg; txtColor = colors.critical; }
              else if (severityUpper === 'MAJOR') { bgColor = colors.majorBg; txtColor = colors.major; }
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
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Safety Systems & Disciplines Verified", 20, currentY);
        currentY += 10;

        autoTableModule.default(doc, {
          startY: currentY + 5,
          margin: { top: 30 },
          head: [['System / Discipline', 'Verification Status']],
          body: analysisResult.systems_detected.map((s: any) => {
            if (typeof s === 'string') {
              const parts = s.split(': ');
              return [parts[0] || s, parts[1] || 'VERIFIED PRESENT'];
            }
            return [s.name || 'System', (s.status || 'verified').toUpperCase()];
          }),
          theme: 'striped',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [240, 240, 240], textColor: colors.primary as [number, number, number] }
        });
      }
      await downloadPdfDocument(doc, buildPdfFilename("Forensic_Audit", plan.fileName));
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-12 space-y-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <Skeleton className="h-12 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-[600px] w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-background text-foreground">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-16 h-16 mx-auto text-amber-500" />
          <h2 className="text-2xl font-bold">Audit Not Found</h2>
          <Button onClick={() => router.push('/dashboard/plans')} variant="outline">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const analysisResult = plan.analysisResult || {};

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard/plans')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700" onClick={handleShare}>
              {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-blue-500" /> : <Share2 className="w-4 h-4 mr-2" />}
              {copied ? "Link Copied" : "Share"}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Generate PDF Audit
            </Button>
          </div>
        </div>

        {/* Header Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 px-3 py-1">PRO AUDIT</Badge>
                    <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white">{plan.fileName}</CardTitle>
                  </div>
                  <CardDescription className="text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-2">
                    <Activity className="w-4 h-4" />
                    Forensic AI analysis completed on {new Date(plan.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-white dark:bg-slate-800/40 backdrop-blur-md border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center p-6 text-center shadow-sm">
            <div className="text-5xl font-black text-blue-600 dark:text-blue-500 mb-1">
              {analysisResult.status === 'manual_review' || analysisResult.score === null ? '--' : `${analysisResult.percentage || analysisResult.score || 0}%`}
            </div>
            <p className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
              {analysisResult.status === 'manual_review' ? 'Manual Review Required' : 'Compliance Score'}
            </p>
          </Card>
        </div>

        {analysisResult.status === 'manual_review' && (
          <Card className="bg-amber-500/5 border border-amber-500/20 shadow-md p-6 rounded-xl space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              Automated AI Verification Unavailable
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="bg-white dark:bg-slate-900/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Automated AI Verification</p>
                <p className="text-sm font-semibold text-red-500 mt-1">Unavailable</p>
              </div>
              <div className="bg-white dark:bg-slate-900/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Deterministic Analysis</p>
                <p className="text-sm font-semibold text-green-500 mt-1">Completed</p>
              </div>
              <div className="bg-white dark:bg-slate-900/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Manual Review</p>
                <p className="text-sm font-semibold text-blue-500 mt-1">Recommended</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              <strong>Reason:</strong> {analysisResult.reason || 'AI quota unavailable during audit.'}
            </p>
          </Card>
        )}

        {/* Human Touch Appreciation */}
        {analysisResult.appreciation && (
          <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-blue-500/20 shadow-xl overflow-hidden relative">
            <div className="absolute top-2 right-2 opacity-5 dark:opacity-10 pointer-events-none">
              <ShieldCheck className="w-24 h-24 text-blue-500" />
            </div>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-slate-900 dark:text-white">
                <Zap className="w-5 h-5 text-amber-500" />
                Informational Highlights & Advisory Comments
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">Key code alignment checks and technical highlights</CardDescription>
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
                    <li key={i} className="flex items-start gap-3 bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{point}</p>
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
            {/* Step-Wise Compliance Breakdown */}
            {analysisResult.steps && (
              <Card className="bg-white dark:bg-slate-800/30 backdrop-blur-lg border-slate-200 dark:border-slate-700/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                    <Activity className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                    Step-Wise Category Audits
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    Click on any construction category to filter compliance findings below.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {analysisResult.steps.map((step: any) => {
                      const isSkipped = step.status === 'skipped';
                      const isCompliant = step.status === 'compliant';
                      const isWarning = step.status === 'warning';
                      const isFailed = step.status === 'failed';
                      const stepIssues = (analysisResult.issues || []).filter((iss: any) => iss.stepId === step.id);
                      const stepCompliant = step.compliant_features || [];

                      return (
                        <div
                          key={step.id}
                          className={`relative overflow-hidden cursor-pointer p-4 rounded-xl border transition-all duration-300 ${activeCategoryFilter === step.id
                            ? 'border-blue-500 ring-2 ring-blue-500/25 bg-blue-50/50 dark:bg-blue-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          onClick={() => setActiveCategoryFilter(activeCategoryFilter === step.id ? null : step.id)}
                        >
                          <div className="flex items-center justify-between font-bold text-sm text-slate-800 dark:text-white mb-2">
                            <span>{step.name}</span>
                            <Badge
                              className={
                                isSkipped ? 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20' :
                                  isCompliant ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' :
                                    isWarning ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                                      'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                              }
                              variant="outline"
                            >
                              {isSkipped ? 'Skipped' : (analysisResult.status === 'manual_review' ? 'Unavailable' : `${step.score}%`)}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                            {step.summary
                              ? step.summary.replace(/^###.*?\n/, '').substring(0, 95) + (step.summary.length > 95 ? '...' : '')
                              : 'No overview available.'}
                          </p>

                          {!isSkipped && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
                              {/* Compliant features */}
                              {stepCompliant.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    Compliant (Awarded)
                                  </div>
                                  <div className="pl-2 space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {stepCompliant.map((feat: string, idx: number) => {
                                      const parts = feat.split(' - ');
                                      const code = parts[0];
                                      const desc = parts.slice(1).join(' - ');
                                      return (
                                        <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal flex items-start gap-1">
                                          <span className="text-green-500 font-bold shrink-0">✓</span>
                                          <span>
                                            <strong className="text-slate-700 dark:text-slate-200">{code}</strong>
                                            {desc ? `: ${desc}` : ''}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Violations */}
                              {stepIssues.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Violations (Deducted)
                                  </div>
                                  <div className="pl-2 space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {stepIssues.map((issue: any, idx: number) => (
                                      <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal flex items-start gap-1">
                                        <span className="text-red-500 font-bold shrink-0">✗</span>
                                        <span>
                                          <strong className="text-slate-700 dark:text-slate-200">{issue.rule || issue.code}</strong>: {issue.title}
                                          <span className="text-red-500 font-semibold ml-1 shrink-0">(-{issue.deductionPercentage || issue.deduction_percentage || 0}%)</span>
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {activeCategoryFilter && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveCategoryFilter(null)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                      >
                        Reset Filter
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Forensic Summary */}
            <Card className="bg-white dark:bg-slate-800/30 backdrop-blur-lg border-slate-200 dark:border-slate-700/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                  Forensic Compliance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <ul className="space-y-4">
                    {(Array.isArray(analysisResult.summary) ? analysisResult.summary.join('\n') : (analysisResult.summary || "No summary available."))
                      .split('\n')
                      .filter(l => l.trim())
                      .map((line, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
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
              <Card className="bg-blue-500/5 border-blue-500/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-5 h-5" />
                    Compliant Features & Positive Findings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(analysisResult.compliant_features || []).map((feature: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-blue-500/10 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Identified Issues */}
            <Card className="bg-white dark:bg-slate-800/40 backdrop-blur-md border-slate-200 dark:border-slate-700/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Code Compliance Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!analysisResult.issues || analysisResult.issues.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-blue-500/50" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Zero Violations Detected</p>
                    <p className="text-slate-500 text-sm mt-1">This plan fully adheres to the 2022 NYC Building Code</p>
                  </div>
                ) : (() => {
                  const filteredIssues = analysisResult.issues.filter(
                    (issue: any) => !activeCategoryFilter || issue.stepId === activeCategoryFilter
                  );
                  if (filteredIssues.length === 0) {
                    return (
                      <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500/70" />
                        <p className="text-lg font-bold text-slate-900 dark:text-white">Zero Violations Found</p>
                        <p className="text-slate-500 text-sm mt-1">No compliance issues detected in this discipline.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      {filteredIssues.map((issue: any, i: number) => {
                        const borderColors = {
                          critical: 'border-l-red-500 dark:border-l-red-600',
                          major: 'border-l-amber-500 dark:border-l-amber-600',
                          minor: 'border-l-blue-500 dark:border-l-blue-600',
                        };
                        const severityClass = borderColors[issue.severity as 'critical' | 'major' | 'minor'] || 'border-l-slate-500';
                        const deduction = issue.deductionPercentage || issue.deduction_percentage || 0;
                        const citation = issue.exactPdfCitation || issue.exact_pdf_citation;
                        const loophole = issue.loopholeDetails || issue.loophole_details;
                        const correction = issue.suggestion || issue.recommendation || issue.requiredElements || issue.required_elements;

                        return (
                          <Card key={i} className={`bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 border-l-4 ${severityClass} transition-all hover:shadow-md`}>
                            <CardHeader className="py-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <CardTitle className="text-slate-900 dark:text-white text-base flex items-center gap-2 flex-wrap">
                                    <span>{issue.title}</span>
                                    {deduction > 0 && (
                                      <Badge variant="destructive" className="bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20 py-0.5 px-2 text-[10px] font-bold">
                                        -{deduction}% Penalty
                                      </Badge>
                                    )}
                                  </CardTitle>
                                  <Badge variant="outline" className="text-slate-500 dark:text-slate-400 font-mono text-[10px] py-0 border-slate-200 dark:border-slate-700">
                                    {issue.rule || issue.code || 'CODE: N/A'}
                                  </Badge>
                                </div>
                                <Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'} className="uppercase text-[10px] tracking-widest font-semibold">
                                  {issue.severity}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="pb-4 space-y-3">
                              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{issue.description}</p>

                              {loophole && loophole !== 'N/A' && (
                                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                                  <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 mb-1">Identified Loophole</p>
                                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{loophole}</p>
                                </div>
                              )}

                              {correction && correction !== 'N/A' && (
                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                                  <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-1">Required Correction & Remedy</p>
                                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{correction}</p>
                                </div>
                              )}

                              {citation && citation !== 'N/A' && (
                                <div className="flex items-start gap-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">PDF Citation:</span>
                                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300 select-all leading-normal">
                                    {citation}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            {/* Building Info / Rooms */}
            {analysisResult.building_info?.rooms && analysisResult.building_info.rooms.length > 0 && (
              <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-white text-base">Detected Habitable Spaces</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysisResult.building_info.rooms.map((room: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50">
                        <span className="text-sm text-slate-300 font-medium">{room.name}</span>
                        <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">{room.dimensions || 'Dimensions Detected'}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hybrid Pipeline Metrics */}
            {analysisResult.metrics && (
              <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/50 py-4">
                  <CardTitle className="text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    Hybrid Pipeline Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Audit Cost</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white">${analysisResult.metrics.estimatedApiCost}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Cost Per Page</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white">${analysisResult.metrics.costPerPage}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Upload Savings</span>
                      <Badge className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20 font-mono">
                        {analysisResult.metrics.uploadReduction}% Saved
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Context Cache Hits</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {analysisResult.metrics.cacheHits} / {analysisResult.metrics.cacheHits + analysisResult.metrics.cacheMisses}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Cached Input Tokens</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {analysisResult.metrics.cachedTokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Pro Escapes (Tokens)</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {analysisResult.metrics.proInputTokens.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Issue Breakdown */}
            <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader><CardTitle className="text-slate-900 dark:text-white text-base">Issue Distribution</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Critical Hazards</span>
                  <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">{(analysisResult.issues || []).filter((i: any) => i.severity === 'critical').length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Major Violations</span>
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">{(analysisResult.issues || []).filter((i: any) => i.severity === 'major').length}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Minor Adherences</span>
                  <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">{(analysisResult.issues || []).filter((i: any) => i.severity === 'minor').length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Value Betterments */}
            {analysisResult.betterments && analysisResult.betterments.length > 0 && (
              <Card className="bg-white dark:bg-slate-800 border-blue-500/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-500" />
                    Betterments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(analysisResult.betterments || []).map((b: string, i: number) => (
                    <div key={i} className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                      <span className="text-blue-500 font-bold mr-2">✦</span>
                      {b.replace(/^Betterment \d+:\s*/, '')}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Safety Systems Verified */}
            {analysisResult.systems_detected && analysisResult.systems_detected.length > 0 && (
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <CardHeader><CardTitle className="text-slate-300 text-xs uppercase tracking-widest">Systems Verified</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {analysisResult.systems_detected.map((s: string, i: number) => (
                    <Badge key={i} className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">{s}</Badge>
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
