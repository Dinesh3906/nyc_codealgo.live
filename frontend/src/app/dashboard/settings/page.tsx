"use client";

import { useState, useCallback } from "react";
import { LifeBuoy, Send, AlertCircle, HelpCircle, Upload, Image as ImageIcon, X, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import api from "@/lib/api";

export default function HelpFeedbackPage() {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [activeTopic, setActiveTopic] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    type: "feedback",
    subject: "",
    message: ""
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setImages(prev => [...prev, ...acceptedFiles].slice(0, 3)); // Limit to 3 images
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 3
  });

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Optimistic: Clear form and show success immediately
    const submittedData = { ...formData };
    const submittedImages = [...images];
    
    setFormData({
      type: "feedback",
      subject: "",
      message: ""
    });
    setImages([]);
    toast.success("Sending your feedback... you can continue working.");

    try {
      const data = new FormData();
      data.append('type', submittedData.type);
      data.append('subject', submittedData.subject);
      data.append('message', submittedData.message);
      
      submittedImages.forEach((img) => {
        data.append('images', img);
      });

      await api.post('/feedback/submit', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success("Feedback sent successfully!", { id: "feedback-success" });
    } catch (error: any) {
      console.error('Feedback error:', error);
      toast.error("Failed to send feedback. Please try again later.");
      // Note: We don't rollback the form to avoid frustrating the user, 
      // but we warn them it failed.
    }
  };

  return (
    <div className="space-y-8 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help & Feedback</h1>
        <p className="text-muted-foreground mt-1">Get support, report issues, or suggest new features</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 backdrop-blur-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Send us a message</CardTitle>
            <CardDescription>We typically respond within 24 hours. You can attach up to 3 screenshots.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Message Type</label>
                  <select 
                    className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    value={formData.type} 
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="feedback">General Feedback</option>
                    <option value="complaint">Complaint / Issue</option>
                    <option value="feature">Feature Request</option>
                    <option value="question">Question</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Subject</label>
                  <Input 
                    required
                    placeholder="Brief summary"
                    className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Message</label>
                <Textarea 
                  required
                  placeholder="How can we help you?"
                  className="min-h-[120px] resize-none bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-xl focus:border-emerald-500"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Attachments (Proofs)</label>
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-700/50 hover:border-emerald-500/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Drag & drop screenshots here, or click to select
                  </p>
                  <p className="text-xs text-slate-400/60 mt-1">PNG, JPG up to 5MB (Max 3)</p>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {images.map((file, index) => (
                      <div key={index} className="relative group aspect-video bg-muted rounded-lg overflow-hidden border border-border">
                        <Image 
                          src={URL.createObjectURL(file)} 
                          alt="Uploaded NYC code analysis reference image" 
                          fill
                          className="absolute inset-0 w-full h-full object-cover"
                          unoptimized
                          onLoad={(e) => {
                            // Optionally revoke the URL if not needed anymore, 
                            // but usually it's fine until the component unmounts
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            type="button"
                            onClick={() => removeImage(index)}
                            className="bg-destructive text-destructive-foreground p-1.5 rounded-full hover:scale-110 transition-transform"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                          <p className="text-[10px] text-white truncate px-1">{file.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button disabled={loading} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20">
                {loading ? (
                  <span className="animate-pulse">Sending...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <LifeBuoy className="w-4 h-4" />
                Quick Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                For urgent account or billing issues, you can also reach us at:
              </p>
              <div className="text-sm">
                <p className="font-semibold text-slate-900 dark:text-white">Support Email</p>
                <a href="mailto:lucky810307@gmail.com" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                  lucky810307@gmail.com
                </a>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Common Topics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {[
                  {
                    q: "How to upload plans?",
                    a: "Go to the 'NYC Code Analyzer' page and click the 'New Check' button at the top right to upload your PDF or image."
                  },
                  {
                    q: "Understanding scores",
                    a: "The compliance score represents how well your plan matches NYC building codes. 100% means no issues were detected."
                  },
                  {
                    q: "Billing & Credits",
                    a: "Each scan costs 1 credit. You can buy more credits in the 'Billing' section using the available packs."
                  }
                ].map((topic, idx) => (
                  <div key={idx} className="transition-all">
                    <button 
                      onClick={() => setActiveTopic(activeTopic === idx ? null : idx)}
                      className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group"
                    >
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-500 transition-colors">{topic.q}</p>
                      <Plus className={`w-4 h-4 transition-transform duration-300 ${activeTopic === idx ? 'rotate-45 text-emerald-500' : 'rotate-0 text-slate-400'}`} />
                    </button>
                    {activeTopic === idx && (
                      <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {topic.a}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
