"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, HelpCircle } from "lucide-react";
import { Card } from "@/shared/components/ui/Card";

const faqs = [
  {
    question: "How does anonymous identity reveal work?",
    answer:
      "Either participant can request an identity reveal. An identity is shown only after the other participant accepts the request.",
  },
  {
    question: "What does Ghost Mode do?",
    answer:
      "Ghost Mode stops sharing your location. Location updates are temporary and expire automatically.",
  },
  {
    question: "How long do stories last?",
    answer: "Stories remain available for 24 hours, then move to the author's archive.",
  },
];

export default function HelpSupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-xl font-bold text-white">Help</h1>
        <div className="w-16" aria-hidden="true" />
      </div>

      <Card className="glass-panel space-y-4 border-white/10 p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <HelpCircle className="h-4 w-4 text-purple-400" />
          Frequently asked questions
        </h2>

        <div className="space-y-2">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            const answerId = `faq-answer-${index}`;
            return (
              <div key={faq.question} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  className="flex min-h-12 w-full items-center justify-between gap-3 p-4 text-left text-xs font-bold text-white hover:text-purple-300"
                >
                  {faq.question}
                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (
                  <p id={answerId} className="border-t border-white/5 px-4 pb-4 pt-3 text-xs leading-5 text-muted-foreground">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="glass-panel border-white/10 p-5 text-sm text-muted-foreground">
        In-app support requests are not available yet. For safety issues, use
        blocking controls from the person&apos;s profile.
      </Card>
    </div>
  );
}
