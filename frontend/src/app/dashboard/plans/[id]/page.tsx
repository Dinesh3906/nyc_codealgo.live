"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { ArrowLeft, Download, Share2, CheckCircle2, AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
        setPlan(res.data);
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
      
      // --- COLOR PALETTE ---
      const colors = {
        primary: [15, 23, 42], // Slate 900 (Main Branding)
        secondary: [51, 65, 85], // Slate 700 (Subheaders)
        text: [71, 85, 105],      // Slate 600 (Body)
        lightText: [148, 163, 184], // Slate 400
        border: [226, 232, 240],   // Slate 200
        bgLight: [248, 250, 252],  // Slate 50
        critical: [220, 38, 38],   // Red 600
        criticalBg: [254, 226, 226], // Red 100
        major: [217, 119, 6],      // Amber 600
        majorBg: [254, 243, 199],  // Amber 100
        minor: [37, 99, 235],      // Blue 600
        minorBg: [219, 234, 254],  // Blue 100
        compliant: [5, 150, 105],  // Emerald 600
        compliantBg: [209, 250, 229] // Emerald 100
      };

      // Helper function to draw rounded badge
      const drawBadge = (text: string, x: number, y: number, w: number, h: number, bgColor: number[], textColor: number[]) => {
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.roundedRect(x, y, w, h, 3, 3, 'F');
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(text, x + (w / 2), y + (h / 2) + 1.2, { align: 'center', baseline: 'middle' });
      };

      // --- PAGE 1: COVER & EXECUTIVE SUMMARY ---
      
      // Top Header Block - Full Page Width
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

      // Project Overview Section
      let currentY = 75;
      
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("Project Overview", 20, currentY);
      
      const score = analysisResult.score || analysisResult.percentage || 0;
      
      // Score Box (Right side)
      const scoreBoxW = 65;
      const scoreBoxX = pageWidth - 20 - scoreBoxW;
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(scoreBoxX, currentY - 5, scoreBoxW, 45, 4, 4, 'FD');
      
      let scoreColor = colors.compliant;
      let statusText = "PASS";
      if (score < 70) {
        scoreColor = colors.major;
        statusText = "REQUIRES REVISION";
      }
      if (score < 40) {
        scoreColor = colors.critical;
        statusText = "CRITICAL FAIL";
      }
      
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score}%`, scoreBoxX + (scoreBoxW / 2), currentY + 16, { align: 'center' });
      
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("COMPLIANCE SCORE", scoreBoxX + (scoreBoxW / 2), currentY + 26, { align: 'center' });
      
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.text(statusText, scoreBoxX + (scoreBoxW / 2), currentY + 33, { align: 'center' });

      // Metadata (Left side)
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

      currentY = 115;
      
      // Divider
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.5);
      doc.line(20, currentY, pageWidth - 20, currentY);
      currentY += 15;

      // executive summary card
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Executive Summary", 20, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      
      // Clean up raw markdown
      const cleanSummary = (analysisResult.summary || "No summary available.")
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/### (.*?)\n/g, '$1\n');
      
      const splitSummary = doc.splitTextToSize(cleanSummary, pageWidth - 50);
      const summaryBoxHeight = (splitSummary.length * 5) + 15;
      
      // Check if summary fits
      if (currentY + summaryBoxHeight > pageHeight - 35) {
        doc.addPage();
        currentY = 30;
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Executive Summary (cont.)", 20, currentY);
        currentY += 10;
      }

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.roundedRect(20, currentY, pageWidth - 40, summaryBoxHeight, 4, 4, 'FD');
      
      doc.text(splitSummary, 25, currentY + 11, { lineHeightFactor: 1.5 });
      currentY += summaryBoxHeight + 20;

      // Compliant Features Section
      if (analysisResult.compliant_features && analysisResult.compliant_features.length > 0) {
        if (currentY > pageHeight - 45) {
          doc.addPage();
          currentY = 30;
        }
        
        doc.setFillColor(colors.compliantBg[0], colors.compliantBg[1], colors.compliantBg[2]);
        doc.roundedRect(20, currentY, pageWidth - 40, 10, 2, 2, 'F');
        
        doc.setTextColor(colors.compliant[0], colors.compliant[1], colors.compliant[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("✓ POSITIVE FINDINGS & COMPLIANT FEATURES", 25, currentY + 7);
        currentY += 18;

        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        
        analysisResult.compliant_features.forEach((feature: string) => {
          const sf = doc.splitTextToSize(feature, pageWidth - 60);
          const featureHeight = (sf.length * 5) + 4;

          if (currentY + featureHeight > pageHeight - 30) {
            doc.addPage();
            currentY = 25;
          }
          doc.setTextColor(colors.compliant[0], colors.compliant[1], colors.compliant[2]);
          doc.setFont('helvetica', 'bold');
          doc.text("•", 25, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          
          doc.text(sf, 32, currentY);
          currentY += featureHeight;
        });
        currentY += 10;
      }

      // Systems Verification Table
      if (analysisResult.systems_detected && analysisResult.systems_detected.length > 0) {
        if (currentY > pageHeight - 60) {
          doc.addPage();
          currentY = 30;
        }

        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Safety Systems Verification", 20, currentY);
        currentY += 6;

        autoTableModule.default(doc, {
          startY: currentY,
          head: [['System Description', 'Status', 'Assessment Notes']],
          body: analysisResult.systems_detected.map((s: any) => [s.name, s.status.toUpperCase(), s.notes || "No issues identified"]),
          theme: 'striped',
          headStyles: { 
            fillColor: [241, 245, 249],
            textColor: colors.primary as [number, number, number],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: {
            textColor: colors.text as [number, number, number]
          },
          alternateRowStyles: { fillColor: [255, 255, 255] },
          styles: { 
            fontSize: 9, 
            cellPadding: 6, 
            lineColor: colors.border as [number, number, number],
            lineWidth: 0.1 
          },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 45 },
            1: { cellWidth: 35 }
          },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 1) {
              const status = data.cell.raw;
              let bgColor = colors.minorBg;
              let txtColor = colors.minor;
              
              if (status === 'PRESENT' || status === 'COMPLIANT') {
                bgColor = colors.compliantBg;
                txtColor = colors.compliant;
              } else if (status === 'MISSING' || status === 'NON-COMPLIANT') {
                bgColor = colors.criticalBg;
                txtColor = colors.critical;
              }

              doc.setFillColor(255, 255, 255);
              doc.rect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, 'F');
              drawBadge(status, data.cell.x + 3, data.cell.y + ((data.cell.height - 6) / 2), 26, 6, bgColor, txtColor);
            }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // --- DETAILED FINDINGS ---
      doc.addPage();
      currentY = 30;

      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("Detailed Compliance Findings", 20, currentY);
      currentY += 10;

      const issues = analysisResult.issues || [];
      if (issues.length === 0) {
        doc.setFillColor(colors.compliantBg[0], colors.compliantBg[1], colors.compliantBg[2]);
        doc.roundedRect(20, currentY, pageWidth - 40, 20, 4, 4, 'F');
        doc.setTextColor(colors.compliant[0], colors.compliant[1], colors.compliant[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("✓ No critical violations or code issues identified.", 25, currentY + 12);
      } else {
        autoTableModule.default(doc, {
          startY: currentY,
          head: [['Issue', 'Severity', 'Code Ref.', 'Recommendation']],
          body: issues.map((issue: any) => [
            issue.title,
            issue.severity.toUpperCase(),
            issue.rule || issue.code || "N/A",
            issue.recommendation || issue.suggestion || issue.description || "-"
          ]),
          theme: 'grid',
          headStyles: { 
            fillColor: colors.primary as [number, number, number], 
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 9, 
            cellPadding: 6,
            lineColor: colors.border as [number, number, number],
            lineWidth: 0.1 
          },
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold', textColor: colors.primary as [number, number, number] },
            1: { cellWidth: 25 },
            2: { cellWidth: 30, fontStyle: 'italic' },
            3: { cellWidth: 'auto', textColor: colors.text as [number, number, number] }
          },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 1) {
              const severity = data.cell.raw;
              let bgColor = colors.minorBg;
              let txtColor = colors.minor;
              
              if (severity === 'CRITICAL') {
                bgColor = colors.criticalBg;
                txtColor = colors.critical;
              } else if (severity === 'MAJOR') {
                bgColor = colors.majorBg;
                txtColor = colors.major;
              }

              doc.setFillColor(255, 255, 255);
              doc.rect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, 'F');
              drawBadge(severity, data.cell.x + 3, data.cell.y + ((data.cell.height - 6) / 2), 19, 6, bgColor, txtColor);
            }
          }
        });
      }

      // --- METHODOLOGY & SCOPE ---
      const finalFindingsY = (doc as any).lastAutoTable?.finalY || 60;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.text("Methodology & Scope", 20, finalFindingsY + 20);
      
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.5);
      doc.line(20, finalFindingsY + 25, pageWidth - 20, finalFindingsY + 25);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      const methodology = "This analysis was performed using the NYC House Code AI forensic plan examiner engine. The engine utilizes a Vectorless RAG architecture to cross-reference extracted architectural data against 113 chapters of the 2022 NYC Building Code, Fire Code, and Zoning Resolutions. This report is intended for advisory purposes only and does not constitute a legal permit or official DOB approval.";
      const splitMethod = doc.splitTextToSize(methodology, pageWidth - 40);
      doc.text(splitMethod, 20, finalFindingsY + 35);

      // --- HEADER & FOOTER SYSTEM ---
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        if (i > 1) {
          doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text("NYC CODE COMPLIANCE AUDIT", 20, 10);
        }

        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.5);
        doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
        doc.text("CONFIDENTIAL - NYC House Code AI Compliance Engine", 20, pageHeight - 8);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 8, { align: 'right' });
      }

      doc.save(`Forensic_Compliance_Report_${plan.fileName.split('.')[0]}.pdf`);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
          <div>
            <h2 className="text-xl font-bold">Plan Not Found</h2>
            <p className="text-muted-foreground mt-1">The requested plan could not be found</p>
          </div>
          <Button onClick={() => router.push('/dashboard/plans')}>
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  const { analysisResult } = plan;

  return (
    <div className="space-y-6 max-w-6xl">
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
              <CardDescription>
                Analyzed on {new Date(plan.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">{analysisResult.score}%</div>
              <p className="text-sm text-muted-foreground">Compliance Score</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {analysisResult.summary || "No summary available."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Critical</span>
              <Badge variant="destructive">
                {(analysisResult.issues || []).filter((i: any) => i.severity === 'critical').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Major</span>
              <Badge variant="warning">
                {(analysisResult.issues || []).filter((i: any) => i.severity === 'major').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Minor</span>
              <Badge variant="secondary">
                {(analysisResult.issues || []).filter((i: any) => i.severity === 'minor').length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identified Issues</CardTitle>
          <CardDescription>
            {analysisResult.issues?.length || 0} issue(s) found during analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!analysisResult.issues || analysisResult.issues.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium">No Issues Identified</p>
              <p className="text-sm mt-1">This plan appears to meet NYC Building Code requirements</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analysisResult.issues.map((issue: any, i: number) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{issue.title || "Compliance Issue"}</CardTitle>
                        <CardDescription>Code: {issue.rule || issue.code || 'N/A'}</CardDescription>
                      </div>
                      <Badge variant={
                        issue.severity === 'critical' ? 'destructive' : 
                        issue.severity === 'major' ? 'warning' : 
                        'secondary'
                      }>
                        {issue.severity || 'minor'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">{issue.description}</p>
                    {(issue.suggestion || issue.recommendation) && (
                      <div className="bg-accent/50 border border-border rounded-md p-3">
                        <p className="text-sm font-medium mb-1">Recommendation</p>
                        <p className="text-sm text-muted-foreground">{issue.suggestion || issue.recommendation}</p>
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
  );
}
