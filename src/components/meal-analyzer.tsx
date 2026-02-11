"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyzeMeal, type MealAnalysis } from "@/app/actions/ai";
import MealReviewModal from "./meal-review-modal";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Pencil } from "lucide-react";

interface MealAnalyzerProps {
  onSave: (data: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }) => Promise<void>;
}

export default function MealAnalyzer({ onSave }: MealAnalyzerProps) {
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<MealAnalysis | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualCalories, setManualCalories] = useState("");
  const { t } = useTranslation();

  const handleAnalyze = async () => {
    if (!description.trim()) return;
    setAnalyzing(true);

    const response = await analyzeMeal(description);

    if (response.success) {
      setResult(response.data);
      setShowReview(true);
    } else {
      toast.error(response.error);
      setShowManual(true);
    }

    setAnalyzing(false);
  };

  const handleSave = async (data: MealAnalysis) => {
    await onSave({
      calories: data.calories,
      protein_g: data.protein,
      carbs_g: data.carbs,
      fat_g: data.fats,
    });
    setShowReview(false);
    setDescription("");
    setResult(null);
    toast.success(t("ai.mealSaved"));
  };

  const handleManualSave = async () => {
    const cal = parseFloat(manualCalories);
    if (!cal || cal <= 0) return;
    await onSave({ calories: cal, protein_g: 0, carbs_g: 0, fat_g: 0 });
    setManualCalories("");
    toast.success(t("ai.mealSaved"));
  };

  return (
    <>
      <Card className="border-border/50 bg-card/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <Label className="text-sm font-semibold">
              {t("ai.smartNutritionist")}
            </Label>
          </div>

          <textarea
            placeholder={t("ai.mealPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[80px] rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            rows={3}
          />

          <Button
            onClick={handleAnalyze}
            disabled={analyzing || !description.trim()}
            className="w-full h-12 gap-2 font-semibold"
          >
            <AnimatePresence mode="wait">
              {analyzing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("ai.analyzing")}
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {t("ai.analyzeWithAI")}
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* Manual input toggle */}
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
          >
            <Pencil className="h-3 w-3" />
            {t("ai.manualInput")}
          </button>

          {/* Manual fallback */}
          <AnimatePresence>
            {showManual && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 pt-2">
                  <Input
                    type="number"
                    placeholder="e.g. 2200"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    className="h-12 bg-background/50"
                  />
                  <Button onClick={handleManualSave} className="h-12 px-6">
                    {t("nutrition.save")}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <MealReviewModal
        open={showReview}
        onClose={() => setShowReview(false)}
        data={result}
        onSave={handleSave}
      />
    </>
  );
}
