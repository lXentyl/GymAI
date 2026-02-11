"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";
import { type MealAnalysis } from "@/app/actions/ai";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

interface MealReviewModalProps {
  open: boolean;
  onClose: () => void;
  data: MealAnalysis | null;
  onSave: (data: MealAnalysis) => void;
}

export default function MealReviewModal({
  open,
  onClose,
  data,
  onSave,
}: MealReviewModalProps) {
  const [editData, setEditData] = useState<MealAnalysis>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    summary: "",
  });
  const { t } = useTranslation();

  useEffect(() => {
    if (data) {
      setEditData({ ...data });
    }
  }, [data]);

  const updateField = (field: keyof MealAnalysis, value: string) => {
    if (field === "summary") {
      setEditData((prev) => ({ ...prev, summary: value }));
    } else {
      setEditData((prev) => ({
        ...prev,
        [field]: parseFloat(value) || 0,
      }));
    }
  };

  const fields = [
    { key: "calories" as const, label: t("ai.calories"), unit: "kcal", color: "text-orange-400" },
    { key: "protein" as const, label: t("ai.protein"), unit: "g", color: "text-blue-400" },
    { key: "carbs" as const, label: t("ai.carbs"), unit: "g", color: "text-emerald-400" },
    { key: "fats" as const, label: t("ai.fats"), unit: "g", color: "text-yellow-400" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            {t("ai.reviewMeal")}
          </DialogTitle>
        </DialogHeader>

        {editData.summary && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-foreground/5 px-4 py-3 text-center"
          >
            <p className="text-sm font-semibold">{editData.summary}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {fields.map((field, i) => (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="space-y-1.5"
            >
              <Label className={`text-xs font-medium ${field.color}`}>
                {field.label}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={editData[field.key]}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="h-12 bg-background/50 text-center text-lg font-bold pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {field.unit}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          {t("ai.editHint")}
        </p>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t("ai.cancel")}
          </Button>
          <Button
            onClick={() => onSave(editData)}
            className="flex-1 gap-2 font-semibold"
          >
            <Check className="h-4 w-4" />
            {t("ai.saveMeal")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
