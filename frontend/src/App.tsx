// ═══════════════════════════════════════════════════════════════
// App — DRFramingBot navigation shell with two-tab UI
// Design reference: UIexample NovaFrame Synthesizer
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { MessageSquareText, Network } from "lucide-react";
import { theme } from "./design/theme";
import ConstellationPage from "./pages/ConstellationPage";
import FramingPage from "./pages/FramingPage";

type Tab = "chat" | "constellation";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  const navItems: { id: Tab; icon: typeof MessageSquareText; label: string }[] = [
    { id: "chat", icon: MessageSquareText, label: "Chat Conversation" },
    { id: "constellation", icon: Network, label: "Knowledge Framing" },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-200 font-sans">
      {/* ─── Left Sidebar ──────────────────────────────────── */}
      <nav
        className={`${theme.layout.sidebarWidth} border-r ${theme.layout.glassBorder} flex flex-col items-center py-6 gap-8 z-50 ${theme.layout.panelBg} ${theme.layout.glassEffect}`}
      >
        {/* Brand */}
        <div className="text-blue-500 font-black text-2xl tracking-tighter cursor-default select-none">
          DF
        </div>

        {/* Nav Buttons */}
        <div className="flex flex-col gap-4">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              title={label}
              className={
                activeTab === id
                  ? theme.components.buttonIconActive
                  : theme.components.buttonIcon
              }
            >
              <Icon size={20} />
            </button>
          ))}
        </div>
      </nav>

      {/* ─── Main Area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className={`${theme.layout.headerHeight} flex items-center justify-between px-8 border-b ${theme.layout.glassBorder} ${theme.layout.panelBg} ${theme.layout.glassEffect} z-40 shrink-0`}
        >
          <h1 className={theme.typography.brand}>
            DRFraming{" "}
            <span className="text-blue-500">Bot</span>
          </h1>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {activeTab === "chat"
              ? "Chat Conversation"
              : "Knowledge Framing"}
          </span>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          {activeTab === "chat" && <FramingPage />}
          {activeTab === "constellation" && <ConstellationPage />}
        </main>
      </div>
    </div>
  );
}
