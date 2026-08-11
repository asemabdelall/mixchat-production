"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Users, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

const slides = [
  {
    step: "07",
    title: "Express Yourself",
    subtitle: "Share moments, stories, and ideas with the world through ultra-fast feeds and media.",
    icon: Sparkles,
    gradient: "gradient-bg-accent",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
  },
  {
    step: "08",
    title: "Find Your People",
    subtitle: "Connect with people who share your vibe, join dynamic groups, or discover nearby friends.",
    icon: Users,
    gradient: "gradient-bg-primary",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  },
  {
    step: "09",
    title: "Your World, Your Way",
    subtitle: "Privacy first. You control ghost mode, anonymous chats, identity reveals, and last seen.",
    icon: ShieldCheck,
    gradient: "bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
  },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentStep < slides.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push("/feed");
    }
  };

  const current = slides[currentStep];
  const Icon = current.icon;

  return (
    <div className="flex flex-col items-center justify-between min-h-[75vh] py-6 text-center">
      {/* Step Indicator Dots */}
      <div className="flex items-center gap-2 mb-6">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentStep(idx)}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              idx === currentStep ? "w-8 gradient-bg-primary" : "w-2 bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* Animated Card Body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center max-w-sm"
        >
          <div className="relative mb-6">
            <div className={`flex h-24 w-24 items-center justify-center rounded-3xl ${current.gradient} text-white shadow-2xl mx-auto`}>
              <Icon className="h-12 w-12" />
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-white mb-2">{current.title}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed px-4 mb-6">
            {current.subtitle}
          </p>

          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl max-h-48 w-full">
            <img src={current.image} alt={current.title} className="w-full h-48 object-cover" />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom Control */}
      <div className="w-full pt-6">
        <Button
          onClick={handleNext}
          size="lg"
          className="w-full h-13 text-base font-bold shadow-xl shadow-purple-500/30"
        >
          <span>{currentStep === slides.length - 1 ? "Get Started" : "Next"}</span>
          {currentStep === slides.length - 1 ? <Check className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
