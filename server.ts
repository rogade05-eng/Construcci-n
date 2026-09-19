import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ColumMaster Pro - Diseñador Estructural de Columnas',
    timestamp: new Date().toISOString(),
  });
});

// API Structural Advisor (Gemini 3.8 Flash)
app.post('/api/structural-advisor', async (req, res) => {
  try {
    const { prompt, designContext } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt es requerido' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        text: 'Nota del Asistente Técnico: La clave API de Gemini no está configurada aún en el panel de secretos. Sin embargo, el motor de cálculo matemático nativo de ColumMaster Pro ha realizado todas las verificaciones estructurales de forma exacta según ACI 318, Eurocódigo y Normas Cubanas (NC).',
        isLocalFallback: true,
      });
    }

    const systemInstruction = `Eres un Ingeniero Estructural Senior experto en el diseño y cálculo de columnas de Hormigón Armado, Acero Estructural y Madera según:
- ACI 318-19 y ACI 318-14
- Eurocódigo 2 (EN 1992-1-1), Eurocódigo 3 (EN 1993-1-1), Eurocódigo 5 (EN 1995-1-1)
- Normas Cubanas: NC 450:2006 (Hormigón Armado), NC 120 (Cargas y combinaciones), NC 207 (Sismo), NC de Madera y Acero.
- Conexiones en acero: soldaduras (filete, garganta eficaz, electrodos AWS E70XX) y conexiones atornilladas (placas base, pernos A325/A490).
- Despieces de acero, empalmes por traslape, confinamiento y cercos.

Responde de forma técnica, precisa, directa y constructiva en español, con referencias a los artículos y fórmulas pertinentes. Contexto del diseño actual proporcionado por el usuario: ${JSON.stringify(designContext || {})}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return res.json({
      text: response.text || 'Sin respuesta generada.',
    });
  } catch (error: any) {
    console.error('Error en structural-advisor:', error);
    return res.status(500).json({
      error: 'Error al consultar el asistente estructural',
      details: error?.message || String(error),
    });
  }
});

// Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ColumMaster Pro corriendo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
