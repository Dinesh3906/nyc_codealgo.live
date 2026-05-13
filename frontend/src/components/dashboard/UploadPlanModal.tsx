"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import api from "@/lib/api";
import { usePlanStore } from "@/lib/store/planStore";
import { io } from "socket.io-client";
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface UploadPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadPlanModal({ isOpen, onClose }: UploadPlanModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const fetchPlans = usePlanStore(state => state.fetchPlans);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setStatus('idle');
      setProgress(0);
      setAnalysisResult(null);
      setErrorMessage("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (status === 'analyzing' && activePlanId) {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "https://cofuncion.com/nyc-house-code-backend");

      socket.on('analysis-status', (data) => {
        if (data.planId !== activePlanId) return;

        if (data.progress) setProgress(data.progress);

        const messages: Record<string, string> = {
          'INITIALIZING': 'Initializing NYC Vectorless RAG Agent...',
          'EXTRACTING_DATA': 'Extracting architectural metadata...',
          'RETRIEVING_RULES': 'Retrieving 2022 NYC Building Codes...',
          'AI_ANALYZING': 'Performing forensic compliance audit...',
          'CHECKING_COMPLIANCE': 'Verifying safety & egress mandates...',
          'GENERATING_REPORT': 'Compiling final forensic report...',
          'COMPLETE': 'Analysis 100% complete!'
        };
        
        if (data.status && messages[data.status]) {
          setStatusMessage(messages[data.status]);
        }

        if (data.status === 'COMPLETE') {
          setProgress(100);
          setTimeout(() => {
            setAnalysisResult(data.report);
            setStatus('completed');
            fetchPlans();
          }, 600);
          socket.disconnect();
        }

        if (data.status === 'FAILED') {
          setErrorMessage(data.error || "Analysis failed");
          setStatus('error');
          socket.disconnect();
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [status, activePlanId, fetchPlans]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: false
  });

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(10);

    const formData = new FormData();
    formData.append('plan', file);

    try {
      const response = await api.post('/plans/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          if (percentCompleted < 90) setProgress(percentCompleted);
        }
      });

      setActivePlanId(response.data.planId);
      setStatus('analyzing');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || "Upload failed");
      setStatus('error');
    }
  };

  const handleDownload = async () => {
    if (!analysisResult || !file) return;

    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const colors: Record<string, [number, number, number]> = {
        primary: [16, 185, 129],
        secondary: [15, 23, 42],
        text: [51, 65, 85],
        lightText: [148, 163, 184],
        border: [226, 232, 240],
        critical: [220, 38, 38],
        major: [245, 158, 11],
        minor: [59, 130, 246]
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

      const score = analysisResult.score || analysisResult.percentage || 0;
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
      doc.line(20, 95, pageWidth - 20, 95);

      const buildingInfo = analysisResult.building_info || {};
      const projectData = [
        ["Project Name:", buildingInfo.project_name || file.name],
        ["Document ID:", activePlanId?.substring(0, 8).toUpperCase() || "N/A"],
        ["Date Analyzed:", new Date().toLocaleDateString()],
        ["Occupancy Group:", buildingInfo.occupancy_group || "Unknown / Not Detected"],
        ["Construction Type:", buildingInfo.construction_type || "Unknown / Not Detected"],
        ["Floor Count:", buildingInfo.stories || "Unknown"],
        ["Primary Use:", buildingInfo.primary_use || "N/A"]
      ];

      autoTable(doc, {
        startY: 100,
        body: projectData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
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
      
      // PAGE BREAK CHECK
      if (finalY + 20 + (splitSummary.length * 5) > pageHeight - 30) {
        doc.addPage();
        finalY = 30;
      }

      doc.text(splitSummary, 20, finalY + 15);
      finalY += (splitSummary.length * 5) + 25;

      if (analysisResult.compliant_features && analysisResult.compliant_features.length > 0) {
        if (finalY > pageHeight - 50) {
          doc.addPage();
          finalY = 20;
        }
        doc.setFillColor(240, 253, 244); // Light Green Background
        doc.rect(20, finalY, pageWidth - 40, 8, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(21, 128, 61); // Dark Green
        doc.text("✓ COMPLIANT FEATURES & POSITIVES", 25, finalY + 6);
        finalY += 12;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        analysisResult.compliant_features.forEach((feature: string) => {
          if (finalY > pageHeight - 20) {
            doc.addPage();
            finalY = 20;
          }
          doc.text(`• ${feature}`, 25, finalY);
          finalY += 7;
        });
        finalY += 10;
      }

      if (analysisResult.systems_detected && analysisResult.systems_detected.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text("SYSTEMS VERIFICATION", 20, finalY);
        finalY += 5;

        autoTable(doc, {
          startY: finalY,
          head: [['System Name', 'Status', 'Assessment Notes']],
          body: analysisResult.systems_detected.map((s: any) => [s.name, s.status.toUpperCase(), s.notes || "-"]),
          headStyles: { fillColor: colors.secondary as [number, number, number] },
          styles: { fontSize: 9 }
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
        doc.text("✓ No violations or critical safety issues identified.", 20, 45);
      } else {
        autoTable(doc, {
          startY: 40,
          head: [['#', 'Severity', 'Title', 'Code Section', 'Recommendation']],
          body: issues.map((issue: any, idx: number) => [
            idx + 1,
            issue.severity.toUpperCase(),
            issue.title,
            issue.rule || issue.code || "N/A",
            issue.recommendation || issue.suggestion || "-"
          ]),
          headStyles: { fillColor: colors.secondary as [number, number, number] },
          columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 30 }, 2: { cellWidth: 40 }, 3: { cellWidth: 30 }, 4: { cellWidth: 70 } },
          styles: { fontSize: 9 }
        });
      }

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
        doc.text(`NYC House Code AI Report - Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      }

      doc.save(`Forensic_Report_${file.name.split('.')[0]}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upload Plan for Analysis</CardTitle>
              <CardDescription>Upload your architectural plan for NYC code compliance check</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'idle' && (
            <>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                  isDragActive ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                {file ? (
                  <div>
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(2)} KB`
                        : `${(file.size / 1024 / 1024).toFixed(2)} MB`} • Ready to analyze
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-slate-900">Drop your file here or click to browse</p>
                    <p className="text-sm text-slate-500 mt-1">Supports PDF and image files</p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  AI analysis is for advisory purposes only. Professional review recommended before DOB submission.
                </p>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                disabled={!file}
                onClick={handleUpload}
              >
                Start Analysis
              </Button>
            </>
          )}

          {(status === 'uploading' || status === 'analyzing') && (
            <div className="text-center py-12 space-y-8 relative overflow-hidden">
              {/* Animated Glow Background */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"
              />

              <div className="relative z-10 space-y-6">
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="64" cy="64" r="58"
                      className="fill-none stroke-slate-100 dark:stroke-slate-800 stroke-[6]"
                    />
                    <motion.circle
                      cx="64" cy="64" r="58"
                      className="fill-none stroke-primary stroke-[6]"
                      strokeDasharray={364}
                      initial={{ strokeDashoffset: 364 }}
                      animate={{ strokeDashoffset: 364 - (364 * progress) / 100 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span 
                      key={progress}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl font-bold tracking-tight"
                    >
                      {progress}%
                    </motion.span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Progress</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={statusMessage}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {status === 'uploading' ? 'Securing Connection...' : statusMessage}
                      </h3>
                      <p className="text-sm text-slate-500 max-w-[280px] mx-auto mt-1">
                        {status === 'uploading' 
                          ? 'Encrypting and uploading your architectural data to our secure servers.'
                          : 'Our senior AI plan examiner is verifying your designs against 113 NYC Building Code chapters.'}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Progress Steps Visualizer */}
                <div className="flex justify-center gap-1.5 px-8">
                  {[10, 30, 50, 70, 90, 100].map((step, idx) => (
                    <motion.div 
                      key={idx}
                      className={`h-1.5 rounded-full flex-1 transition-colors duration-500 ${
                        progress >= step ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                      animate={progress >= step ? { scaleY: [1, 1.5, 1] } : {}}
                      transition={{ duration: 0.4 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {status === 'completed' && analysisResult && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-green-50 border border-green-200 p-6 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">Analysis Complete</h3>
                  <p className="text-sm text-green-700">Compliance score: {analysisResult.score}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Issues Found</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{analysisResult.issues?.length || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Critical</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">
                      {(analysisResult.issues || []).filter((i: any) => i.severity === 'critical').length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {(analysisResult.issues || []).length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analysisResult.issues.slice(0, 3).map((issue: any, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 border rounded-lg">
                      <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                        issue.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{issue.title || issue.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Code: {issue.rule || issue.code || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-12 space-y-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold mb-1 leading-tight">{errorMessage || "Something went wrong"}</h3>
                <p className="text-sm text-slate-500">
                  {errorMessage.includes('limit reached') 
                   ? "You can add more scans to your account immediately from the billing page." 
                   : "Please try again or contact support"}
                </p>
              </div>
              {errorMessage.includes('limit reached') ? (
                <Button 
                  onClick={() => {
                    onClose();
                    window.location.href = '/dashboard/billing';
                  }}
                  className="bg-primary hover:bg-primary/90"
                >
                  Buy Credits
                </Button>
              ) : (
                <Button onClick={() => setStatus('idle')}>
                  Try Again
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
