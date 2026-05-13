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
        primary: [16, 185, 129], // Teal/Green
        secondary: [15, 23, 42], // Dark Blue/Slate
        text: [51, 65, 85],      // Slate 600
        lightText: [148, 163, 184], // Slate 400
        border: [226, 232, 240],   // Slate 200
        critical: [220, 38, 38],   // Red
        major: [245, 158, 11],     // Amber
        minor: [59, 130, 246]      // Blue
      };

      // --- COVER PAGE ---
      doc.setFillColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.rect(0, 0, pageWidth, 60, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text("NYC CODE COMPLIANCE", 20, 30);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text("FORENSIC ANALYSIS REPORT", 20, 45);

      const score = analysisResult.score || 0;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect( pageWidth - 80, 20, 60, 60, 10, 10, 'F');
      
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setFontSize(30);
      doc.text(`${score}%`, pageWidth - 50, 52, { align: 'center' });
      doc.setFontSize(8);
      doc.text("COMPLIANCE", pageWidth - 50, 62, { align: 'center' });
      doc.text("SCORE", pageWidth - 50, 67, { align: 'center' });

      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Project Information", 20, 90);
      
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.line(20, 95, pageWidth - 20, 95);

      const buildingInfo = analysisResult.building_info || {};
      const projectData = [
        ["Project Name:", plan.fileName],
        ["Document ID:", plan.id.substring(0, 8).toUpperCase()],
        ["Date Analyzed:", new Date(plan.createdAt).toLocaleDateString()],
        ["Occupancy Group:", buildingInfo.occupancy_group || "Unknown / Not Detected"],
        ["Construction Type:", buildingInfo.construction_type || "Unknown / Not Detected"],
        ["Floor Count:", buildingInfo.stories || "Unknown"],
        ["Primary Use:", buildingInfo.primary_use || "N/A"]
      ];

      (doc as any).autoTable({
        startY: 100,
        body: projectData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 15;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Executive Summary", 20, finalY);
      doc.line(20, finalY + 5, pageWidth - 20, finalY + 5);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      const splitSummary = doc.splitTextToSize(analysisResult.summary || "No summary available", pageWidth - 40);
      doc.text(splitSummary, 20, finalY + 15);

      finalY += (splitSummary.length * 5) + 25;

      if (analysisResult.systems_detected && analysisResult.systems_detected.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text("Systems Verification Status", 20, finalY);
        doc.line(20, finalY + 5, pageWidth - 20, finalY + 5);

        const systemsData = analysisResult.systems_detected.map((s: any) => [
          s.name, 
          s.status.toUpperCase(), 
          s.notes || "Analyzed against NYC Building Code 2022"
        ]);

        (doc as any).autoTable({
          startY: finalY + 10,
          head: [['System Name', 'Status', 'Assessment Notes']],
          body: systemsData,
          headStyles: { fillColor: colors.secondary },
          columnStyles: {
            1: { halign: 'center', fontStyle: 'bold' }
          }
        });
        
        finalY = (doc as any).lastAutoTable.finalY + 15;
      }

      doc.addPage();
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("Detailed Compliance Findings", 20, 25);
      doc.line(20, 30, pageWidth - 20, 30);

      const issues = analysisResult.issues || [];
      if (issues.length === 0) {
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFontSize(12);
        doc.text("✓ No violations or critical safety issues identified.", 20, 45);
      } else {
        const issuesData = issues.map((issue: any, idx: number) => [
          idx + 1,
          issue.severity.toUpperCase(),
          issue.title,
          issue.rule || issue.code || "NYC BC",
          issue.description + "\n\nRecommendation: " + (issue.recommendation || issue.suggestion || "Review with professional")
        ]);

        (doc as any).autoTable({
          startY: 40,
          head: [['#', 'Severity', 'Title', 'Code Section', 'Description & Recommendation']],
          body: issuesData,
          headStyles: { fillColor: colors.secondary },
          columnStyles: {
            0: { width: 10 },
            1: { width: 25, fontStyle: 'bold' },
            2: { width: 35, fontStyle: 'bold' },
            3: { width: 30 },
            4: { width: 70 }
          },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 1) {
              const severity = data.cell.raw;
              if (severity === 'CRITICAL') doc.setTextColor(colors.critical[0], colors.critical[1], colors.critical[2]);
              else if (severity === 'MAJOR') doc.setTextColor(colors.major[0], colors.major[1], colors.major[2]);
              else doc.setTextColor(colors.minor[0], colors.minor[1], colors.minor[2]);
            }
          }
        });
      }

      const finalFindingsY = (doc as any).lastAutoTable?.finalY || 60;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      doc.text("Methodology & Scope", 20, finalFindingsY + 20);
      doc.line(20, finalFindingsY + 25, pageWidth - 20, finalFindingsY + 25);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      const methodology = "This analysis was performed using the NYC House Code AI forensic plan examiner engine. The engine utilizes a Vectorless RAG architecture to cross-reference extracted architectural data against 113 chapters of the 2022 NYC Building Code, Fire Code, and Zoning Resolutions. This report is intended for advisory purposes only and does not constitute a legal permit or official DOB approval.";
      const splitMethod = doc.splitTextToSize(methodology, pageWidth - 40);
      doc.text(splitMethod, 20, finalFindingsY + 35);

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
        doc.text(`CONFIDENTIAL - NYC House Code AI Compliance Engine`, 20, pageHeight - 10);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
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
