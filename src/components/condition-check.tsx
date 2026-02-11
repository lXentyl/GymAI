"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { type UserCondition } from "@/app/actions/ai";
import { motion } from "framer-motion";

interface ConditionCheckProps {
  open: boolean;
  onClose: () => void;
  onSelect: (condition: UserCondition, injuryDescription?: string) => void;
}

const CONDITIONS: {
  value: UserCondition;
  emoji: string;
  labelKey: string;
  descKey: string;
}[] = [
  {
    value: "great",
    emoji: "💪",
    labelKey: "workout.great",
    descKey: "workout.greatDesc",
  },
  {
    value: "tired",
    emoji: "😴",
    labelKey: "workout.tired",
    descKey: "workout.tiredDesc",
  },
  {
    value: "short_on_time",
    emoji: "⏰",
    labelKey: "workout.shortOnTime",
    descKey: "workout.shortOnTimeDesc",
  },
  {
    value: "injured",
    emoji: "🤕",
    labelKey: "workout.injured",
    descKey: "workout.injuredDesc",
  },
];

export default function ConditionCheck({
  open,
  onClose,
  onSelect,
}: ConditionCheckProps) {
  const [selected, setSelected] = useState<UserCondition | null>(null);
  const [injuryText, setInjuryText] = useState("");
  const { t } = useTranslation();

  const handleSelect = (condition: UserCondition) => {
    if (condition === "injured") {
      setSelected("injured");
    } else {
      onSelect(condition);
      setSelected(null);
      onClose();
    }
  };

  const handleInjurySubmit = () => {
    if (!injuryText.trim()) return;
    onSelect("injured", injuryText);
    setInjuryText("");
    setSelected(null);
    onClose();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSelected(null);
      setInjuryText("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">
            {t("workout.howFeelToday")}
          </DialogTitle>
        </DialogHeader>

        {selected !== "injured" ? (
          <div className="grid grid-cols-2 gap-3">
            {CONDITIONS.map((c, i) => (
              <motion.button
                key={c.value}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(c.value)}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card/50 p-5 hover:bg-foreground/5 hover:border-foreground/20 transition-all active:scale-95"
              >
                <span className="text-3xl">{c.emoji}</span>
                <span className="text-sm font-semibold">{t(c.labelKey)}</span>
                <span className="text-[11px] text-muted-foreground leading-tight text-center">
                  {t(c.descKey)}
                </span>
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground text-center">
              {t("workout.describeInjury")}
            </p>
            <Input
              placeholder={t("workout.injuryPlaceholder")}
              value={injuryText}
              onChange={(e) => setInjuryText(e.target.value)}
              className="h-12 bg-background/50"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelected(null)}
              >
                {t("ai.cancel")}
              </Button>
              <Button
                className="flex-1 font-semibold"
                onClick={handleInjurySubmit}
                disabled={!injuryText.trim()}
              >
                {t("workout.adaptWorkout")}
              </Button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
