"use client";

// Paleta de comandos (⌘K / Ctrl+K): navegación y acciones rápidas desde
// cualquier página. Toque senior de UX — sin dependencias, accesible por teclado.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setActive(0);
  }, []);

  const commands: Cmd[] = useMemo(() => {
    const go = (href: string) => () => {
      close();
      router.push(href);
    };
    return [
      { id: "home", label: "Ir al inicio · ejecutar pre-mortem", hint: "/", run: go("/") },
      { id: "mundo", label: "Mundo 3D · fracasos en el mapa", hint: "/mundo", run: go("/mundo") },
      { id: "memoria", label: "Archivo de memoria · buscar casos", hint: "/memoria", run: go("/memoria") },
      { id: "informes", label: "Informes guardados", hint: "/informes", run: go("/informes") },
      { id: "portafolio", label: "Portafolio · analizar varios proyectos", hint: "/portafolio", run: go("/portafolio") },
      {
        id: "lang",
        label: "Cambiar idioma · ES / EN",
        hint: "language",
        run: () => {
          try {
            const cur = localStorage.getItem("premortem-lang") === "en" ? "es" : "en";
            localStorage.setItem("premortem-lang", cur);
          } catch {
            /* sin localStorage */
          }
          close();
          location.reload();
        },
      },
      { id: "top", label: "Subir al inicio de la página", hint: "scroll", run: () => { close(); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    ];
  }, [router, close]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(term) || c.hint?.includes(term));
  }, [q, commands]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  if (!open) {
    return (
      <button className="cmdk-fab" onClick={() => setOpen(true)} aria-label="Abrir paleta de comandos">
        ⌘K
      </button>
    );
  }

  return (
    <div className="cmdk-overlay" onClick={close} role="dialog" aria-modal="true">
      <div className="cmdk-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              filtered[active]?.run();
            }
          }}
          placeholder="// escribe un comando o navega…"
          aria-label="Buscar comando"
        />
        <div className="cmdk-list">
          {filtered.length === 0 && <div className="cmdk-empty">sin resultados</div>}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              className={`cmdk-item ${i === active ? "on" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={c.run}
            >
              <span>{c.label}</span>
              {c.hint && <span className="cmdk-hint">{c.hint}</span>}
            </button>
          ))}
        </div>
        <div className="cmdk-foot">↑↓ moverse · ↵ ejecutar · esc cerrar</div>
      </div>
    </div>
  );
}
