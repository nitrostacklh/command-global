"use client";

import React, { useState } from "react";
import { BookOpen, Sparkles, HelpCircle, Check, ArrowRight, RotateCw } from "lucide-react";

interface FlashcardData {
  question: string;
  concept: string;
  category: string;
}

export default function LearningTab() {
  const [cards, setCards] = useState<FlashcardData[]>([
    {
      category: "Security Middleware",
      question: "Why should database routers enforce signature validations even inside internal networks?",
      concept: "Zero-Trust Security model dictates that internal network perimeters can be compromised. Signature validation prevents direct malicious queries if gateways are bypassed.",
    },
    {
      category: "API Design Patterns",
      question: "What is structural drift in distributed systems?",
      concept: "Structural drift occurs when actual codebase execution pipelines (API routers, queues) diverge from developer design specification documents.",
    },
    {
      category: "Cache Management",
      question: "Why is a Write-Through Cache preferred over Write-Back in critical payment systems?",
      concept: "Write-Through ensures data is written to cache and main DB synchronously. Bypassing synchronous writes during system failures risks ledger inconsistency.",
    },
  ]);

  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const toggleFlip = (index: number) => {
    setFlippedCards(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 pr-12 space-y-10 scrollbar-none animate-fade-in text-tangent-text">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tangent-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-tangent-secondary uppercase tracking-[0.25em]">Flashcard Center</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tangent-secondary shadow-glow-purple" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-tangent-text font-sans">Architectural Flashcards</h1>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-tangent-border bg-white/[0.01]">
          <BookOpen size={14} className="text-tangent-secondary" />
          <span className="text-xs font-bold text-slate-400">3 Concepts review ready</span>
        </div>
      </div>

      {/* Intro info box */}
      <div className="p-6 rounded-2xl border border-tangent-secondary/10 bg-tangent-secondary/5 flex items-start gap-4 max-w-3xl">
        <Sparkles className="text-tangent-secondary flex-shrink-0 animate-pulse mt-0.5" size={18} />
        <div className="space-y-1">
          <h3 className="text-xs font-black uppercase text-tangent-text tracking-wider">Physics-Based 3D Flipping</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Test your alignment knowledge. Click on any card below to flip it in 3D space. Tangent generates these automatically from identified codebase drifts.
          </p>
        </div>
      </div>

      {/* Grid of Flashcards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
        {cards.map((card, idx) => {
          const isFlipped = !!flippedCards[idx];
          return (
            <div
              key={idx}
              onClick={() => toggleFlip(idx)}
              className="group h-[320px] w-full perspective-1000 cursor-pointer select-none"
            >
              <div
                className={`relative w-full h-full duration-700 transform-style-3d transition-transform ${
                  isFlipped ? "rotate-y-180" : ""
                }`}
              >
                
                {/* 1. FRONT FACE (Question) */}
                <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl border border-tangent-border bg-white/[0.01] hover:border-tangent-primary/30 p-6 flex flex-col justify-between transition-all duration-300 shadow-2xl">
                  {/* Glowing ambient light overlay */}
                  <div className="absolute inset-0 bg-radial-gradient from-tangent-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none" />

                  <div className="flex items-center justify-between z-10">
                    <span className="text-[9px] font-black text-tangent-primary uppercase tracking-widest bg-tangent-primary/5 border border-tangent-primary/10 px-2 py-0.5 rounded">
                      {card.category}
                    </span>
                    <HelpCircle size={14} className="text-slate-600 group-hover:text-tangent-primary transition-colors" />
                  </div>

                  <div className="my-auto z-10">
                    <h3 className="text-sm font-bold text-tangent-text leading-relaxed tracking-wide">
                      {card.question}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-black text-slate-500 tracking-wider z-10 border-t border-tangent-border pt-4">
                    <span>FRONT SIDE</span>
                    <span className="flex items-center gap-1 group-hover:text-tangent-primary transition-colors">
                      FLIP CONCEPT
                      <RotateCw size={10} className="group-hover:rotate-45 transition-transform" />
                    </span>
                  </div>
                </div>

                {/* 2. BACK FACE (Concept Answer) */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl border border-tangent-secondary/20 bg-tangent-secondary/[0.02] hover:border-tangent-secondary/50 p-6 flex flex-col justify-between transition-all duration-300 shadow-2xl shadow-glow-purple/5">
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-tangent-secondary uppercase tracking-widest bg-tangent-secondary/5 border border-tangent-secondary/10 px-2 py-0.5 rounded">
                      Explanatory Concept
                    </span>
                    <Check size={14} className="text-tangent-secondary animate-pulse" />
                  </div>

                  <div className="my-auto">
                    <p className="text-xs text-tangent-text leading-relaxed font-semibold">
                      {card.concept}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-black text-slate-500 tracking-wider border-t border-tangent-border pt-4">
                    <span>BACK SIDE</span>
                    <span className="flex items-center gap-1 text-tangent-secondary">
                      FLIP QUESTION
                      <RotateCw size={10} />
                    </span>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
