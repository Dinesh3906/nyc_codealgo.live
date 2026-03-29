"use client";

import { useState } from "react";
import Navbar from "@/components/ui/Navbar";
import Hero from "@/components/sections/Hero";
import LeadModal from "@/components/ui/LeadModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ProblemSection, 
  SolutionSection, 
  HowItWorks, 
  Pricing, 
  Footer 
} from "@/components/sections/Sections";

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <main className="min-h-screen bg-background">
      <Navbar onOpenModal={openModal} />
      
      <Hero onOpenModal={openModal} />
      
      <ProblemSection />
      
      <SolutionSection />
      
      <HowItWorks />
      
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 max-w-7xl">
          <Card className="shadow-xl">
            <CardContent className="p-12 md:p-20 text-center">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">Stop Guessing. Start Submitting with Confidence.</h2>
              <p className="text-xl text-muted-foreground mb-10">Try our AI scanner today and save weeks on your next DOB filing.</p>
              <Button size="lg" onClick={openModal} className="text-lg px-10 py-6">
                Upload Your First Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Pricing onOpenModal={openModal} />

      <section className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-6 max-w-7xl text-center">
          <blockquote className="max-w-4xl mx-auto italic text-2xl md:text-3xl font-medium text-foreground leading-relaxed mb-6">
            "Brickly helped us catch issues before DOB submission — saved us weeks."
          </blockquote>
          <p className="font-semibold text-primary text-sm uppercase tracking-wide">NYC Real Estate Developer</p>
        </div>
      </section>

      <Footer />

      <LeadModal isOpen={isModalOpen} onClose={closeModal} />
    </main>
  );
}
