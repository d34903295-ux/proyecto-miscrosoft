# frame.md — Pre-Mortem Institucional · video promo

Spec de marca para el video del hackathon (Microsoft Agents League · Reasoning
Agents). Misma identidad "Terminal Forense" que la app.

## Colors

| token     | hex     | uso                                  |
| --------- | ------- | ------------------------------------ |
| bg        | #0b0b0d | fondo de todas las escenas           |
| bg-panel  | #100f12 | tarjetas / paneles                   |
| ink       | #e9e6df | texto principal                      |
| ink-2     | #b7b3aa | texto secundario                     |
| ink-dim   | #86837c | etiquetas / meta                     |
| line      | #2a2930 | filetes y bordes                     |
| amber     | #f2b01e | acento único (titulares clave, datos)|
| amber-ink | #1a1407 | texto sobre ámbar                    |
| red       | #e0574e | severidad alta (uso puntual)         |
| green     | #5bbd6b | confirmaciones (uso puntual)         |

## Typography

- mono: "JetBrains Mono", ui-monospace, monospace — TODO el texto (voz terminal)
- Titulares en MAYÚSCULAS, tracking apretado (-0.02em), line-height 0.96
- Etiquetas/kickers: 0.14–0.22em de tracking, uppercase
- Números con `font-variant-numeric: tabular-nums`

## Corners / Depth

- Sin esquinas redondeadas (border-radius: 0). Sin sombras blandas.
- Profundidad por capas y filetes 1px (#2a2930), nunca por blur.

## Motion

- Curvas secas: power3.out / expo.out para entradas; nada de bounce/elastic.
- Cursor de terminal parpadeante como firma (steps, no fade).
- Barras y números que crecen hasta su valor (como instrumentos).

## What NOT to Do

- No degradados full-screen sobre fondo oscuro (banding H.264).
- No más de UN acento de color por frame (el ámbar manda).
- No tipografías sans/serif: todo mono.
- No esquinas redondeadas ni sombras difusas.
