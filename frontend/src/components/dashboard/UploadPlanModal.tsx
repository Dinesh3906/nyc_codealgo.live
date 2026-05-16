"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import api from "@/lib/api";
import { usePlanStore } from "@/lib/store/planStore";
import { io } from "socket.io-client";
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
      doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - 20, 42, { align: 'right' });

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
      doc.setFillColor(250, 250, 250); // Almost white
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
        ["Project Name", buildingInfo.project_name || file.name],
        ["Document ID", activePlanId?.substring(0, 8).toUpperCase() || "N/A"],
        ["Occupancy", buildingInfo.occupancy_group || "Not Detected"],
        ["Const. Type", buildingInfo.construction_type || "Not Detected"],
        ["Stories", buildingInfo.stories || "Unknown"]
      ];

      let metaY = currentY + 10;
      metadata.forEach(([label, value]) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text(label, 20, metaY);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        
        // Wrap value to prevent overlapping with the score box
        const maxWidth = scoreBoxX - 60; // Leave space between value and box
        const wrappedValue = doc.splitTextToSize(String(value), maxWidth);
        doc.text(wrappedValue, 55, metaY);
        
        // Increase Y based on number of lines in wrapped value
        metaY += (wrappedValue.length * 5) + 2.5;
      });

      currentY = 135;
      
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
      
      // Clean up raw markdown from summary if present
      const cleanSummary = (analysisResult.summary || "No summary available.")
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/### (.*?)\n/g, '$1\n');
      
      const splitSummary = doc.splitTextToSize(cleanSummary, pageWidth - 50);
      
      // Draw summary line-by-line with page break checks
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      
      splitSummary.forEach((line: string) => {
        if (currentY > pageHeight - 35) {
          doc.addPage();
          currentY = 30;
          doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text("Executive Summary (cont.)", 20, currentY);
          currentY += 12;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        }
        
        // Draw a subtle left-border line for the "card" feel that handles breaks
        doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2], 0.2);
        doc.setLineWidth(0.5);
        doc.line(22, currentY - 3, 22, currentY + 2);
        
        doc.text(line, 27, currentY);
        currentY += 5.5;
      });
      
      currentY += 15;

      // Compliant Features Section
      if (analysisResult.compliant_features && analysisResult.compliant_features.length > 0) {
        // Safe check for footer overlap
        if (currentY > pageHeight - 50) {
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
        if (currentY > pageHeight - 65) {
          doc.addPage();
          currentY = 30;
        }

        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Safety Systems Verification", 20, currentY);
        currentY += 6;

        autoTable(doc, {
          startY: currentY,
          margin: { bottom: 30 },
          head: [['System Description', 'Status', 'Assessment Notes']],
          body: analysisResult.systems_detected.map((s: any) => [s.name || 'System', (s.status || 'unknown').toUpperCase(), s.notes || "No issues identified"]),
          theme: 'striped',
          headStyles: { 
            fillColor: [241, 245, 249], // Slate 100
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
        
        const lastTable = (doc as any).lastAutoTable;
        if (lastTable && lastTable.finalY) {
          currentY = lastTable.finalY + 15;
        } else {
          currentY += 40;
        }
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
        autoTable(doc, {
          startY: currentY,
          margin: { top: 30 }, // Add safe margin for headers
          head: [['Issue', 'Severity', 'Code Ref.', 'Recommendation']],
          body: issues.map((issue: any) => [
            issue.title || 'Compliance Issue',
            (issue.severity || 'minor').toUpperCase(),
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
        
        const lastTable = (doc as any).lastAutoTable;
        if (lastTable && lastTable.finalY) {
          currentY = lastTable.finalY + 15;
        } else {
          currentY += 40;
        }
      }

      // --- VALUE-ADD ARCHITECTURAL BETTERMENTS ---
      if (analysisResult.betterments && analysisResult.betterments.length > 0) {
        if (currentY > pageHeight - 65) {
          doc.addPage();
          currentY = 30;
        }

        doc.setFillColor(colors.compliantBg[0], colors.compliantBg[1], colors.compliantBg[2]);
        doc.roundedRect(20, currentY, pageWidth - 40, 12, 3, 3, 'F');
        doc.setTextColor(colors.compliant[0], colors.compliant[1], colors.compliant[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("✦ VALUE-ADD ARCHITECTURAL BETTERMENTS", 25, currentY + 8);
        currentY += 18;

        analysisResult.betterments.forEach((b: string) => {
          const splitB = doc.splitTextToSize(`✦ ${b.replace(/^Betterment \d+:\s*/, '')}`, pageWidth - 50);
          if (currentY + (splitB.length * 5) > pageHeight - 30) {
            doc.addPage();
            currentY = 25;
          }
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          doc.setFontSize(9.5);
          doc.setFont('helvetica', 'normal');
          doc.text(splitB, 25, currentY);
          currentY += (splitB.length * 5) + 4;
        });
        currentY += 10;
      }
      
      // --- CONCLUDING ASSESSMENT & APPRECIATION ---
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

        // Sanitizer: Remove weird AI artifacts like "'&" or symbols at the start
        const cleanPoints = appLines.map((p: string) => 
          p.trim()
           .replace(/^['"&✦•\-\*\s]+/, '') // Remove leading garbage
           .replace(/\s+/g, ' ')           // Clean up extra spaces
        ).filter((p: string) => p.length > 0);

        autoTable(doc, {
          startY: currentY,
          head: [],
          body: cleanPoints.map(p => [`✦ ${p}`]),
          theme: 'plain',
          styles: { 
            fontSize: 10, 
            cellPadding: 6,
            textColor: colors.secondary as [number, number, number],
            fontStyle: 'normal'
          },
          bodyStyles: {
            fillColor: [245, 247, 250],
          },
          columnStyles: { 0: { cellWidth: pageWidth - 40 } },
          margin: { left: 20, right: 20, top: 30, bottom: 40 }
        });

        const lastAppTable = (doc as any).lastAutoTable;
        currentY = (lastAppTable && lastAppTable.finalY) ? lastAppTable.finalY + 15 : currentY + 100;

        // Check if we need a new page for the signature
        if (currentY > pageHeight - 60) {
          doc.addPage();
          currentY = 30;
        }
        // Final Stamp System
        const stampX = pageWidth - 65;
        const stampY = currentY;
        
        doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2], 0.6);
        doc.setLineWidth(1.5);
        doc.circle(stampX + 20, stampY + 20, 18);
        doc.setLineWidth(0.5);
        doc.circle(stampX + 20, stampY + 20, 15);
        
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.text("CERTIFIED AI AUDIT", stampX + 20, stampY + 12, { align: 'center' });
        doc.setFontSize(8);
        doc.text("PASSED", stampX + 20, stampY + 22, { align: 'center' });
        doc.setFontSize(4);
        doc.text("NYC CODEALGO LIVE", stampX + 20, stampY + 28, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        doc.text("Senior AI Plan Examiner Signature", 30, currentY + 15);
        doc.line(30, currentY + 17, 90, currentY + 17);
      }

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
        doc.text("CONFIDENTIAL | Generated by NYC House Code AI Engine", 20, pageHeight - 8);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 8, { align: 'right' });
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
                  isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                {file ? (
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(2)} KB`
                        : `${(file.size / 1024 / 1024).toFixed(2)} MB`} • Ready to analyze
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-foreground">Drop your file here or click to browse</p>
                    <p className="text-sm text-muted-foreground mt-1">Supports PDF and image files</p>
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
              <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Analysis Complete</h3>
                  <p className="text-sm text-emerald-400/80 font-medium">Compliance score: {analysisResult.score}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-800/50 border-slate-700 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-400 text-xs uppercase tracking-wider font-bold">Issues Found</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black text-white">{analysisResult.issues?.length || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-slate-400 text-xs uppercase tracking-wider font-bold">Critical</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black text-red-500">
                      {(analysisResult.issues || []).filter((i: any) => i.severity === 'critical').length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {(analysisResult.issues || []).length > 0 && (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {analysisResult.issues.slice(0, 3).map((issue: any, idx: number) => (
                    <div key={idx} className="flex gap-4 p-4 bg-slate-900/50 border border-slate-700 rounded-xl hover:bg-slate-900 transition-colors">
                      <div className={`p-2 rounded-lg shrink-0 ${issue.severity === 'critical' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                        <AlertCircle className={`w-5 h-5 ${
                          issue.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{issue.title || issue.description}</p>
                        <p className="text-xs text-slate-500 mt-1 font-mono">CODE: {issue.rule || issue.code || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Link href={`/dashboard/plans/${activePlanId}`} className="flex-1">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Eye className="w-4 h-4 mr-2" />
                    See Details
                  </Button>
                </Link>
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
