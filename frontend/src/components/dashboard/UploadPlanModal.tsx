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
          'INITIALIZING': 'Initializing analysis...',
          'EXTRACTING_DATA': 'Extracting plan data...',
          'RETRIEVING_RULES': 'Retrieving NYC codes...',
          'AI_ANALYZING': 'Analyzing compliance...',
          'CHECKING_COMPLIANCE': 'Checking violations...',
          'GENERATING_REPORT': 'Generating report...',
          'COMPLETE': 'Analysis complete!'
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

  const handleDownload = () => {
    if (!analysisResult || !file) return;

    import('jspdf').then(async (jsPDFModule) => {
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text("NYC Building Code Compliance Report", 20, 25);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Project: ${file.name}`, 20, 35);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 40);
      doc.text(`Compliance Score: ${analysisResult.score || 0}%`, 20, 45);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("Executive Summary", 20, 60);

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const summaryText = analysisResult.summary || "No summary available";
      const splitSummary = doc.splitTextToSize(summaryText, 170);
      doc.text(splitSummary, 20, 70);

      const issues = analysisResult.issues || [];
      if (issues.length > 0) {
        let yPos = 70 + (splitSummary.length * 5) + 15;
        
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text("Identified Issues", 20, yPos);
        yPos += 10;

        doc.setFontSize(9);
        issues.forEach((issue: any, idx: number) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          
          const severityText = (issue.severity || 'minor').toUpperCase();
          doc.setTextColor(220, 38, 38);
          doc.text(`${idx + 1}. [${severityText}]`, 20, yPos);
          
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(10);
          const titleText = issue.title || 'Compliance Issue';
          doc.text(titleText, 20, yPos + 5);
          
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          const descText = issue.description || 'No description';
          const splitDesc = doc.splitTextToSize(descText, 170);
          doc.text(splitDesc, 20, yPos + 10);
          
          doc.setTextColor(100, 116, 139);
          doc.text(`Code: ${issue.rule || issue.code || 'N/A'}`, 20, yPos + 10 + (splitDesc.length * 4) + 3);
          
          if (issue.suggestion || issue.recommendation) {
            doc.setTextColor(15, 23, 42);
            const recText = issue.suggestion || issue.recommendation;
            const splitRec = doc.splitTextToSize(`→ ${recText}`, 170);
            doc.text(splitRec, 20, yPos + 10 + (splitDesc.length * 4) + 8);
            yPos += 10 + (splitDesc.length * 4) + 8 + (splitRec.length * 4) + 5;
          } else {
            yPos += 10 + (splitDesc.length * 4) + 8;
          }
        });
      }

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Generated by NYC House Code AI - Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`Compliance_Report_${file.name.split('.')[0]}.pdf`);
    });
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
            <div className="text-center py-12 space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="48" cy="48" r="44"
                    className="fill-none stroke-slate-200 stroke-[8]"
                  />
                  <circle
                    cx="48" cy="48" r="44"
                    className="fill-none stroke-slate-900 stroke-[8] transition-all duration-500"
                    strokeDasharray={276}
                    strokeDashoffset={276 - (276 * progress) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{progress}%</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-1">
                  {status === 'uploading' ? 'Uploading...' : statusMessage}
                </h3>
                <p className="text-sm text-slate-500">
                  {status === 'uploading' ? 'Preparing your file' : 'This may take a moment'}
                </p>
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
