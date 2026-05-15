"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { ArrowLeft, Download, Share2, CheckCircle2, AlertTriangle, Loader2, ShieldCheck, Zap } from "lucide-react";

export default function PlanDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get(`/plans/${id}`)
      .then(res => setPlan(res.data))
      .catch(err => console.error("Fetch failed:", err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!plan?.analysisResult) return;
    Promise.all([import('jspdf'), import('jspdf-autotable')]).then(async ([jsPDFModule, autoTableModule]) => {
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const ar = plan.analysisResult;
      const c = {
        primary: [15, 23, 42] as [number,number,number], secondary: [51, 65, 85] as [number,number,number],
        text: [71, 85, 105] as [number,number,number], lightText: [148, 163, 184] as [number,number,number],
        border: [226, 232, 240] as [number,number,number], critical: [220, 38, 38] as [number,number,number],
        criticalBg: [254, 226, 226] as [number,number,number], major: [217, 119, 6] as [number,number,number],
        majorBg: [254, 243, 199] as [number,number,number], minor: [37, 99, 235] as [number,number,number],
        minorBg: [219, 234, 254] as [number,number,number], compliant: [5, 150, 105] as [number,number,number],
        compliantBg: [209, 250, 229] as [number,number,number]
      };
      const drawBadge = (t:string,x:number,y:number,w:number,h:number,bg:number[],tc:number[]) => {
        doc.setFillColor(bg[0],bg[1],bg[2]); doc.roundedRect(x,y,w,h,3,3,'F');
        doc.setTextColor(tc[0],tc[1],tc[2]); doc.setFontSize(7); doc.setFont('helvetica','bold');
        doc.text(t,x+(w/2),y+(h/2)+1.2,{align:'center',baseline:'middle'});
      };
      // Cover
      doc.setFillColor(c.primary[0],c.primary[1],c.primary[2]); doc.rect(0,0,pageWidth,55,'F');
      doc.setTextColor(255,255,255); doc.setFontSize(24); doc.setFont('helvetica','bold');
      doc.text("FORENSIC COMPLIANCE AUDIT",20,32);
      doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(c.lightText[0],c.lightText[1],c.lightText[2]);
      doc.text("NYC HOUSE CODE AI COMPLIANCE ENGINE",20,42);
      doc.text(new Date(plan.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),pageWidth-20,42,{align:'right'});
      let cy = 75;
      doc.setTextColor(c.primary[0],c.primary[1],c.primary[2]); doc.setFontSize(18); doc.setFont('helvetica','bold');
      doc.text("Project Overview",20,cy);
      const score = ar.score || ar.percentage || 0;
      const sbW=65, sbX=pageWidth-20-sbW;
      doc.setFillColor(250,250,250); doc.setDrawColor(c.border[0],c.border[1],c.border[2]); doc.setLineWidth(0.5);
      doc.roundedRect(sbX,cy-5,sbW,45,4,4,'FD');
      let sc=c.compliant,st="PASS";
      if(score<70){sc=c.major;st="REQUIRES REVISION";}if(score<40){sc=c.critical;st="CRITICAL FAIL";}
      doc.setTextColor(sc[0],sc[1],sc[2]); doc.setFontSize(32); doc.setFont('helvetica','bold');
      doc.text(`${score}%`,sbX+(sbW/2),cy+16,{align:'center'});
      doc.setTextColor(c.secondary[0],c.secondary[1],c.secondary[2]); doc.setFontSize(9); doc.setFont('helvetica','bold');
      doc.text("COMPLIANCE SCORE",sbX+(sbW/2),cy+26,{align:'center'});
      doc.setFontSize(7.5); doc.setTextColor(sc[0],sc[1],sc[2]); doc.text(st,sbX+(sbW/2),cy+33,{align:'center'});
      const bi=ar.building_info||{};
      const meta=[["Project:",plan.fileName],["Document ID:",(plan.id?.substring(0,8).toUpperCase()||"N/A")],["Occupancy:",bi.occupancy_group||"N/A"],["Construction:",bi.construction_type||"N/A"],["Floors:",bi.stories||"Unknown"]];
      let my=cy+10;
      meta.forEach(([l,v])=>{doc.setFontSize(9);doc.setFont('helvetica','bold');doc.setTextColor(c.secondary[0],c.secondary[1],c.secondary[2]);doc.text(l,20,my);doc.setFont('helvetica','normal');doc.setTextColor(c.text[0],c.text[1],c.text[2]);doc.text(v,65,my);my+=7;});
      cy=115; doc.setDrawColor(c.border[0],c.border[1],c.border[2]); doc.setLineWidth(0.5); doc.line(20,cy,pageWidth-20,cy); cy+=15;
      doc.setTextColor(c.primary[0],c.primary[1],c.primary[2]); doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text("Executive Summary",20,cy); cy+=8;
      
      const rawSummary = Array.isArray(ar.summary) ? ar.summary.join('\n') : (ar.summary || "No summary.");
      const cleanSum=rawSummary.replace(/\*\*(.*?)\*\*/g,'$1').replace(/### (.*?)\n/g,'$1\n');
      const ss=doc.splitTextToSize(cleanSum,pageWidth-50);
      doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(c.text[0],c.text[1],c.text[2]);
      ss.forEach((l:string)=>{if(cy>pageHeight-35){doc.addPage();cy=30;}doc.text(l,27,cy);cy+=5.5;});
      cy+=10;

      // Betterments (PDF)
      if (ar.betterments && ar.betterments.length > 0) {
        if (cy > pageHeight - 40) { doc.addPage(); cy = 30; }
        doc.setTextColor(c.primary[0],c.primary[1],c.primary[2]); doc.setFontSize(12); doc.setFont('helvetica','bold');
        doc.text("Value-Add Recommendations", 20, cy); cy += 8;
        ar.betterments.forEach((b: string) => {
          const splitB = doc.splitTextToSize(`✦ ${b}`, pageWidth - 45);
          if (cy + (splitB.length * 5) > pageHeight - 20) { doc.addPage(); cy = 30; }
          doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(c.text[0],c.text[1],c.text[2]);
          doc.text(splitB, 25, cy);
          cy += (splitB.length * 5) + 2;
        });
        cy += 10;
      }

      // Issues (PDF)
      doc.addPage(); cy=30;
      doc.setTextColor(c.primary[0],c.primary[1],c.primary[2]); doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.text("Detailed Findings",20,cy); cy+=10;
      const issues=ar.issues||[];
      if(!issues.length){doc.setFillColor(c.compliantBg[0],c.compliantBg[1],c.compliantBg[2]);doc.roundedRect(20,cy,pageWidth-40,20,4,4,'F');doc.setTextColor(c.compliant[0],c.compliant[1],c.compliant[2]);doc.setFontSize(11);doc.setFont('helvetica','bold');doc.text("✓ No violations found.",25,cy+12);}
      else{autoTableModule.default(doc,{startY:cy,head:[['Issue','Severity','Code','Recommendation']],body:issues.map((i:any)=>[i.title,i.severity.toUpperCase(),i.rule||i.code||"N/A",i.recommendation||i.suggestion||i.description||"-"]),theme:'grid',headStyles:{fillColor:c.primary,textColor:[255,255,255],fontStyle:'bold'},styles:{fontSize:9,cellPadding:6,lineColor:c.border,lineWidth:0.1},columnStyles:{0:{cellWidth:50,fontStyle:'bold',textColor:c.primary},1:{cellWidth:25},2:{cellWidth:30,fontStyle:'italic'},3:{cellWidth:'auto',textColor:c.text}},didDrawCell:(d:any)=>{if(d.section==='body'&&d.column.index===1){const sv=d.cell.raw;let bg=c.minorBg,tc=c.minor;if(sv==='CRITICAL'){bg=c.criticalBg;tc=c.critical;}else if(sv==='MAJOR'){bg=c.majorBg;tc=c.major;}doc.setFillColor(255,255,255);doc.rect(d.cell.x+1,d.cell.y+1,d.cell.width-2,d.cell.height-2,'F');drawBadge(sv,d.cell.x+3,d.cell.y+((d.cell.height-6)/2),19,6,bg,tc);}}});}
      
      // Footers
      const tp=(doc as any).internal.getNumberOfPages();
      for(let i=1;i<=tp;i++){doc.setPage(i);if(i>1){doc.setFillColor(c.primary[0],c.primary[1],c.primary[2]);doc.rect(0,0,pageWidth,15,'F');doc.setTextColor(255,255,255);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text("NYC CODE COMPLIANCE AUDIT",20,10);}doc.setDrawColor(c.border[0],c.border[1],c.border[2]);doc.setLineWidth(0.5);doc.line(20,pageHeight-15,pageWidth-20,pageHeight-15);doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(c.lightText[0],c.lightText[1],c.lightText[2]);doc.text("CONFIDENTIAL - NYC House Code AI",20,pageHeight-8);doc.text(`Page ${i}/${tp}`,pageWidth-20,pageHeight-8,{align:'right'});}
      doc.save(`Forensic_Report_${plan.fileName.split('.')[0]}.pdf`);
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-3 text-sm text-[#bbcabf]">
        <Loader2 className="w-5 h-5 animate-spin text-[#4edea3]" />Loading report...
      </div>
    </div>
  );

  if (!plan) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <AlertTriangle className="w-10 h-10 mx-auto text-red-400" />
        <h2 className="text-lg font-bold text-[#dae2fd]">Plan Not Found</h2>
        <button onClick={() => router.push('/dashboard/plans')} className="text-xs font-bold text-[#4edea3] hover:text-[#6ffbbe]">Back to Plans</button>
      </div>
    </div>
  );

  const { analysisResult: ar } = plan;
  const score = ar.score || ar.percentage || 0;
  const scoreColor = score >= 70 ? 'text-[#4edea3]' : score >= 40 ? 'text-amber-400' : 'text-red-400';
  const criticals = (ar.issues||[]).filter((i:any) => i.severity === 'critical').length;
  const majors = (ar.issues||[]).filter((i:any) => i.severity === 'major').length;
  const minors = (ar.issues||[]).filter((i:any) => i.severity === 'minor').length;

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/dashboard/plans')} className="flex items-center gap-1.5 text-sm text-[#bbcabf] hover:text-[#dae2fd] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2">
          <button onClick={handleShare} className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-[#dae2fd] px-3 py-2 rounded-md transition-all">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#4edea3]" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Share"}
          </button>
          <button onClick={handleDownload} className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] px-3 py-2 rounded-md transition-all active:scale-[0.98]">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#dae2fd] font-headline">{plan.fileName}</h1>
          <p className="text-xs text-[#bbcabf]/60 mt-1">Analyzed {new Date(plan.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-bold ${scoreColor}`}>{score}%</p>
          <p className="text-[10px] font-bold tracking-widest uppercase text-[#bbcabf]/50 mt-1">Compliance Score</p>
        </div>
      </div>

      {/* Summary + Breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 bg-[#131b2e] border border-white/[0.06] rounded-lg p-6">
          <h2 className="text-sm font-semibold text-[#dae2fd] mb-3">Executive Summary</h2>
          <div className="space-y-2">
            {(Array.isArray(ar.summary) ? ar.summary : [ar.summary || "No summary available."]).map((line: string, i: number) => (
              <p key={i} className="text-sm text-[#bbcabf]/80 leading-relaxed">{line.replace(/^[-•]\s*/, '')}</p>
            ))}
          </div>
        </div>
        <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg p-6">
          <h2 className="text-sm font-semibold text-[#dae2fd] mb-4">Issue Breakdown</h2>
          <div className="space-y-3">
            {[{l:"Critical",v:criticals,c:"bg-red-500/10 text-red-400"},{l:"Major",v:majors,c:"bg-amber-500/10 text-amber-400"},{l:"Minor",v:minors,c:"bg-[#b7c8e1]/10 text-[#b7c8e1]"}].map((x,i)=>(
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-[#bbcabf]/60">{x.l}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${x.c}`}>{x.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Betterments */}
      {ar.betterments && ar.betterments.length > 0 && (
        <div className="bg-[#131b2e] border border-[#b7c8e1]/15 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-[#b7c8e1]" />
            <h2 className="text-sm font-semibold text-[#dae2fd]">Value-Add Recommendations</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ar.betterments.map((betterment: string, i: number) => (
              <div key={i} className="flex gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-md">
                <span className="text-[#b7c8e1] mt-0.5 shrink-0 text-xs">✦</span>
                <p className="text-xs text-[#bbcabf]/70 leading-relaxed">{betterment.replace(/^Betterment \d+:\s*/, '')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appreciation */}
      {ar.appreciation && (
        <div className="bg-[#131b2e] border border-[#4edea3]/15 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-[#4edea3]" />
            <h2 className="text-sm font-semibold text-[#dae2fd]">Senior Examiner&apos;s Review</h2>
          </div>
          <ul className="space-y-2.5">
            {(Array.isArray(ar.appreciation) ? ar.appreciation : (ar.appreciation||"").split('\n')).filter((l:any)=>l && String(l).trim()).map((line:any,i:number)=>(
              <li key={i} className="flex gap-2.5 text-xs text-[#bbcabf]/70">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4edea3] shrink-0 mt-0.5" />
                <span>{String(line).replace(/^[•\-\*]\s*/, '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Issues */}
      <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg">
        <div className="p-5 border-b border-white/[0.04]">
          <h2 className="text-sm font-semibold text-[#dae2fd]">Identified Issues</h2>
          <p className="text-xs text-[#bbcabf]/50 mt-0.5">{ar.issues?.length || 0} issue(s) found</p>
        </div>
        {!ar.issues || ar.issues.length === 0 ? (
          <div className="text-center py-14">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-[#4edea3]" />
            <p className="text-sm font-medium text-[#dae2fd]">No Issues Found</p>
            <p className="text-xs text-[#bbcabf]/50 mt-1">This plan meets NYC Building Code requirements</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {ar.issues.map((issue:any, i:number) => (
              <div key={i} className="p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#dae2fd]">{issue.title || "Compliance Issue"}</h3>
                    <p className="text-[11px] text-[#bbcabf]/50 mt-0.5">Code: {issue.rule || issue.code || 'N/A'}</p>
                  </div>
                  <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded shrink-0 ${
                    issue.severity === 'critical' ? 'bg-red-500/10 text-red-400' :
                    issue.severity === 'major' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-[#b7c8e1]/10 text-[#b7c8e1]'
                  }`}>
                    {issue.severity || 'minor'}
                  </span>
                </div>
                <p className="text-xs text-[#bbcabf]/70 mb-3">{issue.description}</p>
                {(issue.suggestion || issue.recommendation) && (
                  <div className="bg-[#4edea3]/5 border border-[#4edea3]/15 rounded-md p-3">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[#4edea3] mb-1">Recommendation</p>
                    <p className="text-xs text-[#bbcabf]/80">{issue.suggestion || issue.recommendation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
