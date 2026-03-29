"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store/authStore";
import toast from "react-hot-toast";
import { HardHat, Building2, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ServicesPage() {
  const { user } = useAuthStore();
  const [leadLoading, setLeadLoading] = useState(false);
  const [contractorLoading, setContractorLoading] = useState(false);

  const [leadForm, setLeadForm] = useState({
    phone: "",
    description: "",
    projectType: "residential"
  });

  const [contractorForm, setContractorForm] = useState({
    name: "",
    companyName: "",
    services: "",
    email: "",
    phone: ""
  });

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadLoading(true);
    try {
      await api.post("/leads/submit-lead", {
        ...leadForm,
        userId: user?.id
      });
      toast.success("Project lead submitted! We will contact you soon.");
      setLeadForm({ phone: "", description: "", projectType: "residential" });
    } catch (err) {
      toast.error("Failed to submit lead. Please try again.");
    } finally {
      setLeadLoading(false);
    }
  };

  const handleContractorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContractorLoading(true);
    try {
      await api.post("/leads/contractor-signup", contractorForm);
      toast.success("Contractor application received!");
      setContractorForm({ name: "", companyName: "", services: "", email: "", phone: "" });
    } catch (err) {
      toast.error("Failed to sign up. Please try again.");
    } finally {
      setContractorLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contractor Services</h1>
        <p className="text-muted-foreground mt-1">Connect with contractors or join our network</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Find a Contractor</CardTitle>
                <CardDescription>Tell us about your project</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  required
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({...leadForm, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Type</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={leadForm.projectType === 'residential' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setLeadForm({...leadForm, projectType: 'residential'})}
                  >
                    Residential
                  </Button>
                  <Button
                    type="button"
                    variant={leadForm.projectType === 'commercial' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setLeadForm({...leadForm, projectType: 'commercial'})}
                  >
                    Commercial
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe what you need help with..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  value={leadForm.description}
                  onChange={(e) => setLeadForm({...leadForm, description: e.target.value})}
                />
              </div>

              <div className="pt-12">
                <Button type="submit" className="w-full" disabled={leadLoading}>
                  {leadLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Submit Lead
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Join the Network</CardTitle>
                <CardDescription>Grow your business with Brickly</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContractorSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  required
                  placeholder="John Doe"
                  value={contractorForm.name}
                  onChange={(e) => setContractorForm({...contractorForm, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Company Name</label>
                <Input
                  required
                  placeholder="NYC Building Co."
                  value={contractorForm.companyName}
                  onChange={(e) => setContractorForm({...contractorForm, companyName: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Services Offered</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Expediting, Construction, Plumbing, etc."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  value={contractorForm.services}
                  onChange={(e) => setContractorForm({...contractorForm, services: e.target.value})}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="contractor@email.com"
                    value={contractorForm.email}
                    onChange={(e) => setContractorForm({...contractorForm, email: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={contractorForm.phone}
                    onChange={(e) => setContractorForm({...contractorForm, phone: e.target.value})}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={contractorLoading}
              >
                {contractorLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Building2 className="w-4 h-4 mr-2" />
                )}
                Register as Contractor
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
