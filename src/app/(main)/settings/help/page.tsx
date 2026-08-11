"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle, MessageSquare, ShieldCheck, FileText, ChevronRight, Send, Check } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

const faqs = [
  { q: "How does Anonymous Chat Identity Reveal work?", a: "When chatting anonymously, either user can request identity reveal. The sender can accept or reject. If accepted, their Mix Chat username is revealed." },
  { q: "What is Ghost Mode on the Live Map?", a: "Ghost mode hides your real-time GPS location pin from all friends on the map while letting you view nearby friends." },
  { q: "How long do Mix Stories last?", a: "Normal stories last 24 hours. Plus subscribers can extend story duration up to 48 hours." },
];

export default function HelpSupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [contactMsg, setContactMsg] = useState("");
  const [sent, setSent] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMsg.trim()) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setContactMsg("");
    }, 1500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
        <h1 className="text-xl font-bold text-white">Help & Support</h1>
        <div className="w-16" />
      </div>

      {/* FAQ Section */}
      <Card className="glass-panel p-6 border-white/10 space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-purple-400" />
          <span>Frequently Asked Questions</span>
        </h3>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="glass-card rounded-2xl overflow-hidden border border-white/10">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-white hover:text-purple-300 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronRight className={`h-4 w-4 transition-transform ${openFaq === idx ? "rotate-90 text-purple-400" : ""}`} />
              </button>

              {openFaq === idx && (
                <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-white/5 pt-2">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Contact Support Form */}
      <Card className="glass-panel p-6 border-white/10 space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-400" />
          <span>Contact Mix Support Team</span>
        </h3>

        <form onSubmit={handleContactSubmit} className="space-y-3">
          <textarea
            rows={3}
            placeholder="Describe your issue or feedback..."
            value={contactMsg}
            onChange={(e) => setContactMsg(e.target.value)}
            className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
            required
          />
          <Button type="submit" className="w-full h-11 text-xs font-bold">
            {sent ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            <span>{sent ? "Message Sent to Support!" : "Send Message"}</span>
          </Button>
        </form>
      </Card>

      {/* Legal Links */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <button className="glass-panel p-3 rounded-2xl border border-white/10 text-muted-foreground hover:text-white transition-colors flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-purple-400" />
          <span>Privacy Policy</span>
        </button>
        <button className="glass-panel p-3 rounded-2xl border border-white/10 text-muted-foreground hover:text-white transition-colors flex items-center justify-center gap-1.5">
          <FileText className="h-4 w-4 text-blue-400" />
          <span>Terms of Service</span>
        </button>
      </div>
    </div>
  );
}
