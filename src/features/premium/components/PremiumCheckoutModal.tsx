"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, CreditCard, Lock } from "lucide-react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { PremiumPlan } from "@/types";
import { useAuth } from "@/shared/providers/AuthProvider";

interface PremiumCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PremiumPlan;
}

export const PremiumCheckoutModal: React.FC<PremiumCheckoutModalProps> = ({
  isOpen,
  onClose,
  plan,
}) => {
  const { updateProfile } = useAuth();
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("•••");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      updateProfile({ isPremium: true });

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Subscribe to ${plan.name}`}>
      {!isSuccess ? (
        <form onSubmit={handlePay} className="space-y-4">
          <div className="gradient-bg-primary rounded-2xl p-4 text-white flex items-center justify-between shadow-lg mb-2">
            <div>
              <span className="text-xs uppercase font-semibold tracking-wider text-purple-200">Selected Plan</span>
              <h3 className="text-xl font-bold">{plan.name}</h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold">{plan.price}</span>
              <span className="text-xs text-purple-200 block">/ month</span>
            </div>
          </div>

          <Input
            label="Card Number"
            icon={<CreditCard className="h-4 w-4" />}
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Expiry Date"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              required
            />
            <Input
              label="CVC / CVV"
              placeholder="123"
              type="password"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Lock className="h-3.5 w-3.5 text-purple-400" />
            <span>256-Bit SSL Encrypted Instant Activation</span>
          </div>

          <Button type="submit" isLoading={isLoading} size="lg" className="w-full h-12 text-base gradient-bg-accent shadow-xl shadow-pink-500/25">
            <Sparkles className="h-5 w-5" />
            <span>Confirm & Pay {plan.price}</span>
          </Button>
        </form>
      ) : (
        <div className="text-center py-8 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-bg-primary text-white shadow-2xl mx-auto">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-bold text-white">VIP Upgrade Successful! 🎉</h3>
          <p className="text-xs text-purple-300">Your Neon Profile Badge & VIP perks are now active.</p>
        </div>
      )}
    </Modal>
  );
};
