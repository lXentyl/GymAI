"use client";

import Reveal from "@/components/reveal";

export default function Footer() {
  return (
    <Reveal delay={0.5} duration={0.8} y={10}>
      <footer className="w-full py-4 text-center">
        <p className="text-xs text-muted-foreground font-light tracking-wide">
          Powered by{" "}
          <span className="font-medium text-foreground/60">
            ZyntexSolutions
          </span>
        </p>
      </footer>
    </Reveal>
  );
}
