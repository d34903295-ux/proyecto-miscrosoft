"use client";

// ─────────────────────────────────────────────────────────────
// Kit de movimiento del sitio (framer-motion + Lenis).
//
// Principios: la estética es "terminal forense" — el movimiento debe sentirse
// como un instrumento que imprime/revela evidencia, no como una landing de
// marketing. Curvas secas, distancias cortas, una sola vez por elemento.
// Respeta prefers-reduced-motion en todos los niveles.
// ─────────────────────────────────────────────────────────────

import Lenis from "lenis";
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

/** Easing de la casa: salida rápida, frenada seca (cubic-out). */
export const EASE: [number, number, number, number] = [0.215, 0.61, 0.355, 1];

/** Scroll suave inercial con Lenis (desactivado si el usuario pide menos movimiento). */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [reduce]);
  return <>{children}</>;
}

/** Revela un bloque al entrar al viewport: sube y aparece, una sola vez. */
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px 0px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Contador que cuenta hasta `value` cuando entra en pantalla. */
export function AnimatedNumber({
  value,
  duration = 1.1,
}: {
  value: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px 0px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduce]);
  return <span ref={ref}>{shown}</span>;
}

/** Barra horizontal que crece hasta `pct` (0..100) al entrar en pantalla. */
export function GrowBar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      initial={reduce ? false : { width: 0 }}
      whileInView={{ width: `${pct}%` }}
      viewport={{ once: true, margin: "-40px 0px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      style={reduce ? { width: `${pct}%` } : undefined}
    />
  );
}
