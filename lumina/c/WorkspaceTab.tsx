"use client";

import React, { useState } from "react";
import {
  FileCode2,
  FolderOpen,
  Cpu,
  Sparkles,
  Bot,
  Brain,
  Layers,
  ChevronRight,
  Play,
  RotateCcw,
  Zap,
  BookOpen
} from "lucide-react";

interface WorkspaceTabProps {
  onNavigateToTab: (tab: any) => void;
  onSelectDriftNode?: () => void;
}

export default function WorkspaceTab({ onNavigateToTab, onSelectDriftNode }: WorkspaceTabProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>("Database Router");
  const [confidence, setConfidence] = useState(64);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "assistant",
      text: "I've analyzed your actual implementation. There is a structural difference: your DB Router connects directly to public feeds, bypassing the gateway check.",
      code: "/* Expected Path: User -> Gateway -> DB */\n/* Actual Path: User -> DB (Direct Socket) */",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const files = [
    { name: "gateway.ts", type: "file" },
    { name: "db_router.ts", type: "file", warning: true },
    { name: "auth_service.ts", type: "file" },
    { name: "package.json", type: "file" },
    { name: "config.yaml", type: "file" },
  ];

  const nodes = [
    { id: "n1", label: "User Client", type: "input", x: 40, y: 30, status: "aligned" },
    { id: "n2", label: "Auth Gateway", type: "logic", x: 140, y: 30, status: "aligned" },
    { id: "n3", label: "Database Router", type: "db", x: 260, y: 70, status: "drift" },
    { id: "n4", label: "User Store", type: "storage", x: 140, y: 110, status: "aligned" },
  ];

  const handleAction = (actionType: string) => {
    setIsTyping(true);
    let reply = "";
    let codeSnippet = "";

    if (actionType === "explain") {
      reply = "Explain: The 'Database Router' accepts arbitrary HTTP requests instead of securing input through JWT middleware in 'Auth Gateway'. This represents an operational drift.";
      codeSnippet = "export async function handleQuery(req) {\n  // Missing jwtVerify(req.headers.authorization)\n  const client = await pool.connect(); \n}";
    } else if (actionType === "timeline") {
      onNavigateToTab("timeline");
      setIsTyping(false);
      return;
    } else if (actionType === "why") {
      reply = "Why: Students often bypass gateways during local testing to speed up debugging, but leaving direct socket bindings in production configurations deviates from the design blueprint.";
    } else if (actionType === "flashcard") {
      onNavigateToTab("learning");
      setIsTyping(false);
      return;
    }

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        { sender: "assistant", text: reply, code: codeSnippet },
      ]);
      setIsTyping(false);
    }, 1000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: "user", text: userText, code: "" }]);
    setChatInput("");
    setIsTyping(true);

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          sender: "assistant",
          text: "Based on your layout, you can reconcile this anomaly by adding an incoming gateway signature check before launching queries. Try examining: `db_router.ts#L42-L58`.",
          code: "if (req.headers['x-gateway-signature'] !== process.env.GATEWAY_SECRET) {\n  throw new Error('Access denied');\n}",
        },
      ]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full animate-fade-in">
      
      {/* 1. Left Explorer Panel */}
      <div className="w-60 border-r border-tangent-border bg-white/[0.01] flex flex-col justify-between flex-shrink-0">
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between text-slate-500 uppercase tracking-widest text-[9px] font-black">
            <span>Project Files</span>
            <FolderOpen size={10} />
          </div>

          <div className="space-y-1">
            {files.map((file, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  file.name === "db_router.ts"
                    ? "bg-tangent-error/5 text-tangent-error border border-tangent-error/10"
                    : "text-slate-400 hover:text-tangent-text hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCode2 size={13} className={file.warning ? "text-tangent-error" : "text-slate-500"} />
                  <span className="truncate">{file.name}</span>
                </div>
                {file.warning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-tangent-error shadow-glow-red animate-pulse" />
                )}
              </div>
            ))}
          </div>

          <div className="w-full h-[1px] bg-tangent-card" />

          {/* Canvas Blueprint Info */}
          <div className="space-y-3">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Architecture Spec</span>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-tangent-border space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-tangent-text">
                <span>Auth Flow v1.0</span>
                <span className="text-[8px] bg-tangent-primary/10 text-tangent-primary px-1.5 py-0.5 rounded">Locked</span>
              </div>
              <p className="text-[9px] text-slate-500 leading-relaxed font-medium">Original layout specifies 3 microservices and 1 authorization loop.</p>
            </div>
          </div>
        </div>

        {/* Sync telemetry */}
        <div className="p-4 bg-tangent-card border-t border-tangent-border flex items-center justify-between text-[9px] font-black text-slate-500 tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tangent-success" />
            VCS Live Sync
          </span>
          <span>HEAD @ 3a8d9a</span>
        </div>
      </div>

      {/* 2. Center Node Canvas Area */}
      <div className="flex-1 bg-[#020617] relative flex flex-col justify-between overflow-hidden">
        {/* Top Control Bar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-tangent-border bg-white/[0.01] backdrop-blur-md pointer-events-auto shadow-2xl">
            <Layers size={12} className="text-tangent-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Workspace Canvas</span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-tangent-border bg-white/[0.01] hover:bg-white/[0.04] text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-tangent-text transition-all cursor-pointer">
              <RotateCcw size={10} />
              Reset View
            </button>
            <button
              onClick={() => onNavigateToTab("timeline")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tangent-primary hover:bg-tangent-accent text-black font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-glow-cyan"
            >
              <Zap size={10} fill="black" />
              Trace Anomaly
            </button>
          </div>
        </div>

        {/* Node connections visual rendering */}
        <div className="relative w-full h-full flex items-center justify-center pointer-events-auto">
          {/* Background Grid */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* SVG Connector Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Draw paths between nodes */}
            <g opacity="0.6">
              {/* User Client to Auth Gateway */}
              <path d="M 120 180 Q 220 180, 220 180" stroke="rgba(110, 231, 255, 0.4)" strokeWidth="2" strokeDasharray="5 5" fill="none" />
              {/* Auth Gateway to Database Router */}
              <path d="M 320 180 Q 400 180, 440 220" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="2" fill="none" />
              {/* Auth Gateway to User Store */}
              <path d="M 320 180 Q 320 260, 220 260" stroke="rgba(110, 231, 255, 0.3)" strokeWidth="2" fill="none" />
              {/* Direct socket shortcut (DRIFT) User client directly to Database Router */}
              <path d="M 120 180 Q 280 280, 440 220" stroke="rgba(239, 68, 68, 0.8)" strokeWidth="2.5" strokeDasharray="8 4" className="animate-flow" fill="none" style={{ filter: "drop-shadow(0 0 6px #EF4444)" }} />
            </g>
          </svg>

          {/* Interactive Mock Canvas Nodes */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center gap-12 flex-wrap p-16 select-none">
            
            {/* Node 1: User Client */}
            <div className="absolute left-[8%] top-[35%] p-4 rounded-2xl border border-tangent-border bg-white/[0.01] backdrop-blur-md w-44 space-y-2 group hover:border-tangent-borderBright transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Input</span>
                <span className="w-1.5 h-1.5 rounded-full bg-tangent-success" />
              </div>
              <h4 className="text-xs font-bold text-tangent-text">User Client</h4>
              <p className="text-[9px] text-slate-500 font-medium">HTTPS / WebSocket feeds</p>
            </div>

            {/* Node 2: Auth Gateway */}
            <div className="absolute left-[32%] top-[35%] p-4 rounded-2xl border border-tangent-border bg-white/[0.01] backdrop-blur-md w-44 space-y-2 group hover:border-tangent-borderBright transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Middleware</span>
                <span className="w-1.5 h-1.5 rounded-full bg-tangent-success" />
              </div>
              <h4 className="text-xs font-bold text-tangent-text">Auth Gateway</h4>
              <p className="text-[9px] text-slate-500 font-medium">JSON Web Token Checker</p>
            </div>

            {/* Node 3: Database Router (DRIFTING) */}
            <div
              onClick={() => setSelectedNode("Database Router")}
              className={`absolute left-[62%] top-[45%] p-4 rounded-2xl border w-48 space-y-2 cursor-pointer transition-all duration-300 ${
                selectedNode === "Database Router"
                  ? "border-tangent-error bg-tangent-error/5 shadow-glow-red scale-105"
                  : "border-tangent-error/40 bg-white/[0.01] hover:border-tangent-error"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black text-tangent-error uppercase tracking-widest">Drift Detected</span>
                <span className="w-2 h-2 rounded-full bg-tangent-error shadow-glow-red animate-pulse" />
              </div>
              <h4 className="text-xs font-bold text-tangent-text">Database Router</h4>
              <p className="text-[9px] text-slate-400 font-medium">Postgres / Redis Connector</p>
              <div className="pt-2 flex items-center justify-between text-[8px] font-black text-tangent-error tracking-wider border-t border-tangent-error/10">
                <span>Bypassed Middleware</span>
                <ChevronRight size={10} />
              </div>
            </div>

            {/* Node 4: User Store */}
            <div className="absolute left-[32%] top-[60%] p-4 rounded-2xl border border-tangent-border bg-white/[0.01] backdrop-blur-md w-44 space-y-2 group hover:border-tangent-borderBright transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Storage</span>
                <span className="w-1.5 h-1.5 rounded-full bg-tangent-success" />
              </div>
              <h4 className="text-xs font-bold text-tangent-text">User Store</h4>
              <p className="text-[9px] text-slate-500 font-medium">Memory Cache / Key-Value</p>
            </div>

          </div>
        </div>

        {/* Bottom Legend details */}
        <div className="p-4 border-t border-tangent-border bg-white/[0.01] backdrop-blur-md flex items-center justify-between text-[9px] font-black text-slate-500 tracking-wider">
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-tangent-success" /> Aligned Node</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-tangent-error" /> Drift Node</span>
          </span>
          <span>Click any drift node to investigate with AI</span>
        </div>
      </div>

      {/* 3. Right AI Assistant Panel */}
      <div className="w-80 border-l border-tangent-border bg-white/[0.01] flex flex-col justify-between flex-shrink-0">
        
        {/* AI Header & Dial */}
        <div className="p-4 border-b border-tangent-border space-y-4 bg-tangent-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-tangent-primary animate-pulse" />
              <span className="text-xs font-bold text-tangent-text uppercase tracking-wider">Tangent Audit AI</span>
            </div>
            <span className="text-[8px] px-2 py-0.5 rounded bg-tangent-card text-slate-400 font-black uppercase">v2.0</span>
          </div>

          {/* Confidence circular progress */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-tangent-border">
            <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.02)" strokeWidth="4" fill="transparent" />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  stroke={confidence < 70 ? "#EF4444" : "#6EE7FF"}
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray="138"
                  strokeDashoffset={138 - (138 * confidence) / 100}
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute text-[10px] font-black text-tangent-text">{confidence}%</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Design Alignment</span>
              <p className="text-[10px] text-tangent-text font-medium leading-normal mt-0.5">
                {confidence < 70 ? "Critical architecture variance located" : "No critical drifts detected"}
              </p>
            </div>
          </div>
        </div>

        {/* AI Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-1.5 ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`p-3 rounded-2xl text-xs max-w-[90%] leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-tangent-primary text-black font-semibold rounded-tr-sm"
                    : "bg-white/[0.03] border border-tangent-border text-tangent-text rounded-tl-sm"
                }`}
              >
                {msg.text}
              </div>
              
              {/* Code blocks with syntax highlighting */}
              {msg.code && (
                <div className="w-full p-3 rounded-xl bg-tangent-bg border border-tangent-border font-mono text-[9px] text-slate-400 overflow-x-auto select-all">
                  <pre>{msg.code}</pre>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold p-3">
              <Brain size={12} className="animate-spin" />
              <span>Analyzing telemetry...</span>
            </div>
          )}
        </div>

        {/* Action Controls Panel */}
        <div className="p-4 border-t border-tangent-border space-y-3 bg-tangent-card">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAction("explain")}
              className="flex items-center justify-center gap-1 py-2 rounded-lg border border-tangent-border bg-white/[0.02] hover:bg-white/[0.05] text-[9px] font-black uppercase tracking-wider text-tangent-text hover:text-tangent-text cursor-pointer active:scale-95"
            >
              Explain Anomaly
            </button>
            <button
              onClick={() => handleAction("timeline")}
              className="flex items-center justify-center gap-1 py-2 rounded-lg border border-tangent-border bg-white/[0.02] hover:bg-white/[0.05] text-[9px] font-black uppercase tracking-wider text-tangent-text hover:text-tangent-text cursor-pointer active:scale-95"
            >
              Locate Drift
            </button>
            <button
              onClick={() => handleAction("why")}
              className="flex items-center justify-center gap-1 py-2 rounded-lg border border-tangent-border bg-white/[0.02] hover:bg-white/[0.05] text-[9px] font-black uppercase tracking-wider text-tangent-text hover:text-tangent-text cursor-pointer active:scale-95"
            >
              Ask Why
            </button>
            <button
              onClick={() => handleAction("flashcard")}
              className="flex items-center justify-center gap-1 py-2 rounded-lg bg-tangent-secondary/10 hover:bg-tangent-secondary/20 border border-tangent-secondary/20 text-tangent-secondary font-black text-[9px] uppercase tracking-wider cursor-pointer active:scale-95"
            >
              Get Flashcard
            </button>
          </div>

          {/* Form input */}
          <form onSubmit={handleSendMessage} className="relative mt-2">
            <input
              type="text"
              placeholder="Ask Tangent about code drift..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-tangent-border bg-white/[0.02] text-xs placeholder-slate-600 focus:outline-none focus:border-tangent-primary/30 text-tangent-text"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-tangent-card border border-tangent-border hover:border-white/20 text-tangent-text flex items-center justify-center cursor-pointer active:scale-95"
            >
              <ChevronRight size={14} />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
