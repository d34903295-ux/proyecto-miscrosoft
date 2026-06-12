"use client";

// Reloj REAL del visitante: hora y zona horaria del dispositivo (la zona la
// resuelve el navegador según la configuración regional del equipo — cambia
// sola según el país del usuario). Se renderiza solo en cliente para no
// desincronizar el SSR.

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

export default function Clock({ lang }: { lang: Lang }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  const time = now.toLocaleTimeString(lang === "en" ? "en-US" : "es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;

  return (
    <span className="clock" title={tz} suppressHydrationWarning>
      {time} · {city}
    </span>
  );
}
