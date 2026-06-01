"use client";
import { useState } from "react";
import { ChevronRight, RotateCcw, Building, FileCheck, Landmark, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function FreeCheckerPage() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [step]: val }));
    setStep(prev => prev + 1);
  };

  const reset = () => {
    setStep(1);
    setAnswers({});
  };

  return (
    <main className="min-h-screen py-24 px-6 bg-background">
      <div className="container mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Do I Need CodeAlgo?</h1>
        <p className="text-xl text-muted-foreground mb-12">Find out the best compliance path for your NYC project.</p>
        
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 min-h-[400px] flex flex-col justify-center">
          
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-semibold mb-8 text-foreground">1. What is your role on the project?</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <button onClick={() => handleAnswer("architect")} className="flex flex-col items-center p-6 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all">
                  <Building className="w-10 h-10 text-primary mb-4" />
                  <span className="font-medium text-foreground">Architect / PE</span>
                </button>
                <button onClick={() => handleAnswer("expediter")} className="flex flex-col items-center p-6 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all">
                  <FileCheck className="w-10 h-10 text-primary mb-4" />
                  <span className="font-medium text-foreground">Expediter</span>
                </button>
                <button onClick={() => handleAnswer("developer")} className="flex flex-col items-center p-6 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all">
                  <Landmark className="w-10 h-10 text-primary mb-4" />
                  <span className="font-medium text-foreground">Developer / Owner</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <h2 className="text-2xl font-semibold mb-8 text-foreground">2. What phase is your project currently in?</h2>
              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <button onClick={() => handleAnswer("design")} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-secondary transition-colors text-left">
                  <span className="font-medium">Schematic / Design Dev.</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                <button onClick={() => handleAnswer("cd")} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-secondary transition-colors text-left">
                  <span className="font-medium">Final Construction Documents</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                <button onClick={() => handleAnswer("dob")} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-secondary transition-colors text-left">
                  <span className="font-medium">Ready for DOB NOW Upload</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <h2 className="text-2xl font-semibold mb-8 text-foreground">3. What is your biggest current bottleneck?</h2>
              <div className="flex flex-col gap-4 max-w-md mx-auto">
                <button onClick={() => handleAnswer("time")} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-secondary transition-colors text-left">
                  <span className="font-medium">Plan Review takes too long</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                <button onClick={() => handleAnswer("objections")} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-secondary transition-colors text-left">
                  <span className="font-medium">Constant DOB Objections</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                <button onClick={() => handleAnswer("zoning")} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-secondary transition-colors text-left">
                  <span className="font-medium">Complex Zoning Interpretations</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in zoom-in duration-500 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-foreground">Your Recommended Action</h2>
              
              {answers[2] === 'design' ? (
                <p className="text-lg text-muted-foreground mb-8">
                  Since you are in early design, CodeAlgo can act as your automated Code Consultant. Run your plans through our AI weekly to catch egress and fire-rating issues before they are drafted into the final CDs.
                </p>
              ) : answers[2] === 'dob' ? (
                <p className="text-lg text-muted-foreground mb-8">
                  You are ready for DOB NOW. Run a final Pre-Permit Audit with CodeAlgo to catch any missing TR1s, ZD1s, or egress errors that will trigger an examiner objection.
                </p>
              ) : (
                <p className="text-lg text-muted-foreground mb-8">
                  For final construction documents, you need comprehensive safety checks. CodeAlgo evaluates your plans against 113 NYC Building Code chapters in minutes.
                </p>
              )}
              
              <div className="flex justify-center gap-4">
                <button onClick={reset} className="px-6 py-3 border border-border rounded-lg text-foreground hover:bg-secondary transition flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Start Over
                </button>
                <Link href="/register" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium shadow">
                  Try CodeAlgo Free
                </Link>
              </div>
            </div>
          )}
          
          {step < 4 && (
            <div className="mt-auto pt-8">
              <div className="flex justify-center gap-2">
                {[1,2,3].map(i => (
                  <div key={i} className={`h-2 rounded-full transition-all duration-300 ${step >= i ? 'w-8 bg-primary' : 'w-2 bg-border'}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
