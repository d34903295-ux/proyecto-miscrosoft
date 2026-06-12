# 🚀 Cumplir la integración Foundry — GRATIS y sin tarjeta

> **Aclaración oficial de los jueces (Agents League):** *"The 'minimum Foundry
> integration' includes: at least one Microsoft Foundry hosted model. The agent
> can be built with the Microsoft Agent Framework locally. Other options: Foundry
> Toolkit (VS Code) and **Foundry Local**."*
> Y: *"you will require a live backend to demo the solution and record the video."*

Traducción: **basta con que tu agente razone usando al menos un modelo alojado en
Microsoft Foundry, corriendo en vivo durante el demo.** No hace falta una
suscripción de Azure de pago. **Foundry Local** es exactamente eso: modelos de
Foundry ejecutándose en tu computadora, **gratis y sin cuenta de Azure**.

Tu proyecto ya tiene los adaptadores listos (`lib/llm.ts`).

---

## ✅ Ruta A — GitHub Models (recomendada para PC baja: nube, $0, sin instalar nada)

GitHub Models es **el tier gratuito de los Microsoft Foundry Models** (Microsoft
documenta el camino *"GitHub Models → Microsoft Foundry Models"*: el mismo catálogo
de modelos alojados en Foundry). Corre **en la nube**, así que tu PC no hace nada
de cómputo. **Gratis con rate limits, sin tarjeta, sin cuenta de Azure.**

### Paso 1 — Crear un token de GitHub (gratis)
1. Entra a <https://github.com/settings/personal-access-tokens> → **Generate new
   token** (fine-grained).
2. En **Permissions → Account permissions** activa **"Models" → Read-only**.
3. Genera y copia el token (`github_pat_...`).

### Paso 2 — Configurar el proyecto
En `.env.local`:
```env
LLM_PROVIDER=github
GITHUB_TOKEN=github_pat_TU_TOKEN
GITHUB_MODEL=openai/gpt-4o-mini
```
`openai/gpt-4o-mini` es un modelo del catálogo de Foundry y es rápido/barato en
tokens. (También sirve `meta/Llama-3.3-70B-Instruct`, `microsoft/Phi-4`, etc.)

### Paso 3 — Correr y verificar
```bash
npm install
npm run dev      # http://localhost:3000
```
Genera un pre-mortem → el pie del reporte muestra **`razonamiento: github`** y la
llamada real sale a **`models.github.ai`** (el gateway de Foundry Models).

### Paso 4 — Video (la prueba)
Muestra: el reporte con el indicador de razonamiento en vivo, y abre la pestaña
**Network** del navegador para enseñar la llamada a `models.github.ai/inference`
(modelo `openai/gpt-4o-mini`). Eso demuestra que el agente razona con un modelo
**alojado en Microsoft Foundry**, en vivo, sin nada local.

> 💬 GitHub Models es el tier gratis de Foundry Models — argumento sólido. Si
> quieres blindarlo, pregúntale a Lee en Discord "does using a Microsoft Foundry
> model via the **GitHub Models** free tier satisfy the minimum?" (dirá que sí).
> Si por lo que sea no lo aceptaran, usa la **Ruta B** (Foundry Local), que es
> indiscutible — y el modelo `qwen2.5-0.5b` es minúsculo (~400 MB, corre en
> cualquier PC, sin GPU).

---

## ✅ Ruta B — Foundry Local (indiscutible: $0, sin tarjeta, sin Azure)

### Requisitos
- Windows 10/11, o macOS (Apple Silicon), o Linux x64.
- ~8 GB de RAM para modelos pequeños (más RAM = modelo mejor).

### Paso 1 — Instalar Foundry Local
```bash
# Windows
winget install Microsoft.FoundryLocal

# macOS
brew tap microsoft/foundrylocal && brew install foundrylocal
```

### Paso 2 — Arrancar un modelo de Foundry
```bash
foundry model run qwen2.5-0.5b
```
`qwen2.5-0.5b` es minúsculo (corre en equipos modestos). Si tu máquina aguanta,
usa algo mejor para respuestas más finas: `foundry model run phi-3.5-mini`.

### Paso 3 — Ver el endpoint (el puerto es dinámico)
```bash
foundry service status
```
Copia el endpoint que muestra, por ejemplo `http://localhost:5272`.

### Paso 4 — Configurar el proyecto
En `.env.local`:
```env
LLM_PROVIDER=foundry
FOUNDRY_LOCAL_ENDPOINT=http://localhost:5272   # el de tu `foundry service status`
FOUNDRY_LOCAL_MODEL=qwen2.5-0.5b
```

### Paso 5 — Correr y verificar
```bash
npm install
npm run dev      # http://localhost:3000
```
Genera un pre-mortem. En el **pie del reporte** debe decir
**`razonamiento: foundry`**. 👉 **Esa es tu prueba del backend de Foundry en vivo.**

### Paso 6 — Grabar el video (2-3 min)
Muestra: tu terminal con `foundry service status` corriendo, la app generando el
pre-mortem, y el indicador **`razonamiento: foundry`** en pantalla. Eso demuestra
que el agente usa un modelo alojado en Microsoft Foundry, en vivo.

> 💡 Alternativa sin instalar nada pesado: **GitHub Models** (`LLM_PROVIDER=github`
> + un token de GitHub con permiso *Models: read*). Es inferencia gratuita servida
> por la infraestructura de Azure AI Foundry. Si dudas si "cuenta", confírmalo con
> Lee en Discord; **Foundry Local es la opción 100% indiscutible.**

---

## 🔼 Ruta C — Foundry IQ completo (opcional, requiere Azure de pago)

Si más adelante consigues una cuenta de Azure (tuya o de un tercero con tarjeta
real), puedes subir de "modelo de Foundry" a la **capa de recuperación Foundry IQ**
(memoria institucional real en la nube). El código también está listo:

1. Crea **Azure AI Search** (tier **Basic**, ~$0.10/h, bórralo el mismo día) y un
   **Azure OpenAI** con un deploy `gpt-4o-mini`.
2. En `.env.local`: `RETRIEVER=foundryiq` + `AZURE_SEARCH_ENDPOINT` /
   `AZURE_SEARCH_API_KEY` / `FOUNDRY_KB_NAME` + `AZURE_OPENAI_*` (ver `.env.example`).
3. `npm run seed:foundryiq` → crea índice + knowledge source + knowledge base.
4. Reinicia: el reporte mostrará **`memoria: foundryiq`** (recuperación IQ en vivo).
5. Al terminar, borra el resource group para frenar el cobro (~$2-4 total).

> Esto es un **plus**, no es obligatorio: con la **Ruta A** (GitHub Models) ya
> cumples el mínimo que confirmaron los jueces.

---

## Checklist final de entrega
- [ ] Modelo de Foundry en vivo (Ruta A: `razonamiento: github` + llamada a
      `models.github.ai`; o Ruta B: `razonamiento: foundry`)
- [ ] Video (2-3 min) con ese indicador / llamada en pantalla = backend en vivo
- [ ] **Repositorio en PÚBLICO** (GitHub → Settings → Change visibility → Public)
- [ ] Enlace del video pegado en `SUBMISSION.md`
- [ ] Proyecto registrado y subido antes del **14-jun**
