"use client";

import Reveal from "@/components/reveal";
import { useTranslation } from "@/lib/i18n";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <Reveal delay={0.5} duration={0.8} y={10}>
      <footer className="w-full py-4 text-center">
        <p className="text-xs text-muted-foreground font-light tracking-wide">
          {t("footer.poweredBy")}{" "}
          <span className="font-medium text-foreground/60">
            ZyntexSolutions
          </span>
        </p>
      </footer>
    </Reveal>
  );
}
