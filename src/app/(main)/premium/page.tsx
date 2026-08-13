"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Check, Crown } from "lucide-react";
import { MOCK_PREMIUM_PLANS } from "@/shared/services/mockData";
import { PremiumPlan } from "@/types";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { PremiumCheckoutModal } from "@/features/premium/components/PremiumCheckoutModal";

export default function PremiumPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      {/* Hero Banner */}
      <div className="text-center space-y-3 relative py-4">
        <div className="inline-flex items-center gap-2 rounded-full glass-card px-4 py-1.5 text-xs text-purple-300 border border-purple-500/30 mb-2 shadow-lg">
          <Crown className="h-4 w-4 text-purple-400" />
          <span className="font-semibold">Unlock Mix Chat Ultra VIP Experience</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight gradient-text">
          Elevate Your Social Power
        </h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Get exclusive profile badges, 4K HD video calls, unlimited anonymous chat radar matches, and cloud storage.
        </p>

        {/* Billing Toggle Switch */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-xs font-semibold ${billingCycle === "monthly" ? "text-white" : "text-muted-foreground"}`}>
            Monthly Billing
          </span>

          <button
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
            className="w-14 h-8 rounded-full glass-card p-1 relative border border-white/20 transition-colors cursor-pointer"
          >
            <div
              className={`w-6 h-6 rounded-full gradient-bg-primary shadow-md transition-transform ${
                billingCycle === "yearly" ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>

          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${billingCycle === "yearly" ? "text-white" : "text-muted-foreground"}`}>
              Annual Billing
            </span>
            <Badge variant="accent" className="text-[10px] px-2 py-0.5">
              SAVE 25%
            </Badge>
          </div>
        </div>

        {/* Analytics Teaser Link */}
        <div className="pt-3">
          <Link href="/premium/analytics" className="inline-flex items-center gap-1.5 text-xs text-purple-300 hover:text-white font-bold underline">
            <Sparkles className="h-3.5 w-3.5" />
            <span>View Plus Analytics Preview</span>
          </Link>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MOCK_PREMIUM_PLANS.map((plan) => {
          const priceDisplay =
            billingCycle === "yearly"
              ? plan.id === "plan_plus"
                ? "$3.75"
                : "$7.50"
              : plan.price;

          return (
            <Card
              key={plan.id}
              className={`glass-panel p-8 flex flex-col justify-between border-white/10 relative overflow-hidden transition-all duration-300 hover:border-purple-500/50 ${
                plan.isPopular ? "ring-2 ring-purple-500 shadow-2xl shadow-purple-500/20" : ""
              }`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0">
                  <span className="gradient-bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-bl-xl shadow-md">
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  {plan.badge && <Badge variant="premium">{plan.badge}</Badge>}
                </div>

                <div className="my-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{priceDisplay}</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                </div>

                <div className="space-y-3 my-6 pt-4 border-t border-white/10">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-xs text-gray-200">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full gradient-bg-primary text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setSelectedPlan(plan)}
                size="lg"
                variant={plan.isPopular ? "gradient" : "glass"}
                className="w-full h-12 text-sm font-semibold shadow-lg mt-4"
              >
                <Sparkles className="h-4 w-4" />
                <span>Upgrade to {plan.name}</span>
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <PremiumCheckoutModal
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          plan={selectedPlan}
        />
      )}
    </div>
  );
}
