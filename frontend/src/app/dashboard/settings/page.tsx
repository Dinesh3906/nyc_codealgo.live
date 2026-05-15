"use client";

import { useState, useCallback } from "react";
import { LifeBuoy, Send, HelpCircle, Upload, X, Plus } from "lucide-react";
import { toast } from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import api from "@/lib/api";

export default function HelpFeedbackPage() {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [activeTopic, setActiveTopic] = useState<number | null>(null);
  const [formData, setFormData] = useState({ type: "feedback", subject: "", message: "" });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setImages(prev => [...prev, ...acceptedFiles].slice(0, 3));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 3
  });

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append('type', formData.type);
      data.append('subject', formData.subject);
      data.append('message', formData.message);
      images.forEach(img => data.append('images', img));
      await api.post('/feedback/submit', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success("Thank you! Your message has been sent.");
      setFormData({ type: "feedback", subject: "", message: "" });
      setImages([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "flex h-10 w-full rounded-md border border-white/[0.08] bg-[#171f33] px-3 py-2 text-sm text-[#dae2fd] placeholder:text-[#bbcabf]/40 focus:outline-none focus:ring-2 focus:ring-[#4edea3]/30 focus:border-[#4edea3]/40 transition-all";
  const topics = [
    { q: "How to upload plans?", a: "Go to the 'Analyzer' page and click 'New Compliance Check' to upload your PDF or image." },
    { q: "Understanding scores", a: "The compliance score represents how well your plan matches NYC building codes. 100% means no issues detected." },
    { q: "Billing & Credits", a: "Each scan costs 1 credit. Buy more in the 'Billing' section." }
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#dae2fd] font-headline tracking-tight">Help & Feedback</h1>
        <p className="text-sm text-[#bbcabf] mt-1">Get support, report issues, or suggest features</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-2 bg-[#131b2e] border border-white/[0.06] rounded-lg p-6">
          <h2 className="text-base font-semibold text-[#dae2fd] mb-1">Send us a message</h2>
          <p className="text-xs text-[#bbcabf]/60 mb-5">We respond within 24 hours. Attach up to 3 screenshots.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest uppercase text-[#bbcabf]">Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className={inputCls}>
                  <option value="feedback">General Feedback</option>
                  <option value="complaint">Complaint / Issue</option>
                  <option value="feature">Feature Request</option>
                  <option value="question">Question</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest uppercase text-[#bbcabf]">Subject</label>
                <input required placeholder="Brief summary" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className={inputCls} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase text-[#bbcabf]">Message</label>
              <textarea required placeholder="How can we help?" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className={`${inputCls} min-h-[120px] resize-none`} />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold tracking-widest uppercase text-[#bbcabf]">Attachments</label>
              <div {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${isDragActive ? 'border-[#4edea3]/50 bg-[#4edea3]/5' : 'border-white/[0.08] hover:border-white/[0.15]'}`}>
                <input {...getInputProps()} />
                <Upload className="w-6 h-6 mx-auto mb-2 text-[#bbcabf]/30" />
                <p className="text-xs text-[#bbcabf]/60">Drag & drop screenshots, or click to select</p>
                <p className="text-[10px] text-[#bbcabf]/30 mt-1">PNG, JPG up to 5MB (Max 3)</p>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((file, i) => (
                    <div key={i} className="relative group aspect-video bg-[#171f33] rounded-md overflow-hidden border border-white/[0.06]">
                      <img src={URL.createObjectURL(file)} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => removeImage(i)} className="bg-red-500 text-white p-1.5 rounded-full hover:scale-110 transition-transform">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[9px] text-white truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button disabled={loading} type="submit"
              className="inline-flex items-center gap-2 bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-xs font-bold tracking-wider uppercase px-5 py-2.5 rounded-md transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? <div className="w-4 h-4 border-2 border-[#003824]/30 border-t-[#003824] rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              Send Message
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#131b2e] border border-[#4edea3]/15 rounded-lg p-5">
            <h3 className="text-xs font-bold tracking-widest uppercase text-[#4edea3] flex items-center gap-2 mb-3">
              <LifeBuoy className="w-4 h-4" /> Quick Support
            </h3>
            <p className="text-xs text-[#bbcabf]/70 mb-3">For urgent issues:</p>
            <a href="mailto:lucky810307@gmail.com" className="text-xs text-[#4edea3] hover:text-[#6ffbbe] transition-colors">lucky810307@gmail.com</a>
          </div>

          <div className="bg-[#131b2e] border border-white/[0.06] rounded-lg overflow-hidden">
            <div className="p-4 border-b border-white/[0.04]">
              <h3 className="text-xs font-bold tracking-widest uppercase text-[#dae2fd] flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> Common Topics
              </h3>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {topics.map((t, i) => (
                <div key={i}>
                  <button onClick={() => setActiveTopic(activeTopic === i ? null : i)}
                    className="w-full p-4 text-left hover:bg-white/[0.02] transition-colors flex items-center justify-between group">
                    <p className="text-xs font-medium text-[#dae2fd] group-hover:text-[#4edea3] transition-colors">{t.q}</p>
                    <Plus className={`w-3.5 h-3.5 transition-transform duration-200 ${activeTopic === i ? 'rotate-45 text-[#4edea3]' : 'text-[#bbcabf]/40'}`} />
                  </button>
                  {activeTopic === i && (
                    <div className="px-4 pb-4"><p className="text-[11px] text-[#bbcabf]/60 leading-relaxed">{t.a}</p></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
