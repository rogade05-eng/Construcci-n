/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface AiStructuralAdvisorProps {
  currentContext: {
    material: string;
    standard: string;
    dimensions: string;
    loads: string;
    dcr: number;
    isSafe: boolean;
    confinement: string;
  };
}

export const AiStructuralAdvisor: React.FC<AiStructuralAdvisorProps> = ({ currentContext }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: `Hola, soy tu consultor estructural IA. He analizado los datos actuales de tu columna (${currentContext.material.toUpperCase()}, Norma: ${currentContext.standard}, DCR: ${(currentContext.dcr * 100).toFixed(1)}%). ¿En qué puedo asesorarte hoy? Puedo sugerir optimizaciones de acero, verificar confinamiento sísmico, detalles de empalmes o placas base.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const predefinedPrompts = [
    '¿Cómo puedo optimizar la cuantía de acero para esta columna?',
    'Verificar requisitos sísmicos especiales según ACI 318-19 y Norma Cubana',
    '¿Qué recomendaciones constructivas aplicar para los solapes y cercos en obra?',
    '¿Conviene aumentar la sección transversal o subir la resistencia del hormigón?',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const newMessages = [...messages, { role: 'user' as const, text: query }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/structural-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          context: currentContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al consultar al asesor estructural.');
      }

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', text: data.reply }]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: `Nota técnica: No se pudo conectar al servidor de IA (${err.message}). Por regla de diseño estructural, asegúrese de que la cuantía longitudinal esté entre 1% y 3% para zonas de alta sismicidad, con separación de cercos no mayor a d/4 ni 100 mm en zonas críticas l₀.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 shadow-2xl flex flex-col h-[480px]">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-semibold text-slate-100 font-mono">
            Asesor Estructural Inteligente (Gemini AI)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
          ACI 318 / Eurocódigo / NC
        </span>
      </div>

      {/* Chips de consultas rápidas */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {predefinedPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(p)}
            className="text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-800 transition text-left"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Historial de mensajes */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 font-sans text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg max-w-[90%] leading-relaxed ${
              m.role === 'assistant'
                ? 'bg-slate-900 border border-slate-800 text-slate-200 mr-auto'
                : 'bg-cyan-950/80 border border-cyan-700/60 text-cyan-100 ml-auto'
            }`}
          >
            <div className="font-mono text-[10px] text-slate-400 mb-1 font-semibold">
              {m.role === 'assistant' ? 'CONSULTOR ESTRUCTURAL IA' : 'INGENIERO'}
            </div>
            <div className="whitespace-pre-line">{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="p-3 bg-slate-900 rounded-lg text-slate-400 border border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-xs">Calculando optimización y analizando normativas...</span>
          </div>
        )}
      </div>

      {/* Input de consulta */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="mt-3 pt-2 border-t border-slate-800 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta sobre armado, ductilidad, uniones soldadas o normativa..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg font-mono transition"
        >
          Consultar
        </button>
      </form>
    </div>
  );
};
