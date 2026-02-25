
/**
 * NOVAFRAME DESIGN SYSTEM v1.1
 * A standalone design system for Research Knowledge Visualization.
 * This file contains all UI styles, layout parameters, and visualization logic.
 */

export const theme = {
    // 1. Layout & Surfaces
    layout: {
        sidebarWidth: "w-16",
        headerHeight: "h-16",
        asideWidth: "w-[450px]",
        mainBg: "bg-slate-950",
        canvasBg: "bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#020617_100%)]",
        glassEffect: "backdrop-blur-md",
        glassBorder: "border-slate-800/50",
        panelBg: "bg-slate-950/50",
        scrollbar: "custom-scrollbar", // Refers to CSS in index.html
        // Fix: Added missing detailSidebar property for the research detail view
        detailSidebar: "bg-slate-950/70 backdrop-blur-xl",
    },

    // 2. Color Palette
    colors: {
        primary: "#2563eb", // blue-600
        accent: "#3b82f6",  // blue-500
        success: "#10b981", // emerald-500
        warning: "#f59e0b", // amber-500
        danger: "#ef4444",  // red-500
        text: {
            bright: "#f8fafc", // slate-50
            normal: "#e2e8f0", // slate-200
            dim: "#94a3b8",    // slate-400
            muted: "#475569",  // slate-600
        },
        // The Core Design Research Framing Dimensions
        framing: {
            explorative: "#3b82f6",    // Blue
            critical: "#a855f7",       // Purple
            constructive: "#10b981",    // Emerald
            problemSolving: "#f59e0b",  // Amber
        }
    },

    // 3. Fonts
    fonts: {
        mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
    },

    // 4. Typography
    typography: {
        brand: "text-xs font-black uppercase tracking-[0.3em]",
        heading: "text-2xl font-black uppercase tracking-tighter text-white",
        subheading: "text-[10px] font-black uppercase tracking-widest text-slate-500",
        label: "text-[10px] font-bold uppercase tracking-wider",
        mono: "font-mono text-[9px] uppercase",
        body: "text-sm text-slate-300 leading-relaxed",
    },

    // 4. Component UI Patterns (Tailwind Class Aggregates)
    // Fix: Renamed 'styles' to 'components' and added 'card' to align with component usage
    components: {
        card: "bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 transition-all hover:border-blue-500/30 shadow-xl",
        glassCard: "bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 transition-all hover:border-blue-500/30 shadow-xl",
        innerCard: "bg-slate-950/50 border border-slate-800 rounded-xl p-4 shadow-inner",
        buttonPrimary: "bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.2)] disabled:opacity-50",
        buttonGhost: "bg-slate-900 border border-slate-700 text-slate-300 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-blue-500 transition-all active:scale-95",
        buttonIcon: "p-2.5 rounded-xl transition-all text-slate-500 hover:text-white hover:bg-slate-800",
        buttonIconActive: "p-2.5 rounded-xl transition-all bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]",
        input: "bg-slate-950 border border-slate-800 rounded-xl py-2 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all",
        badge: "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-slate-800",
    },

    // 5. Visualization Configuration
    viz: {
        map: {
            physics: {
                linkDistance: 240,
                chargeStrength: -1200,
                collisionPadding: 20,
                alphaTarget: 0.3,
                velocityDecay: 0.4,
            },
            links: {
                opacity: 0.2,
                activeOpacity: 0.5,
                baseWidth: 1.2,
                activeColor: "#3b82f6",
                inactiveColor: "#1e293b",
            }
        },
        nodes: {
            baseRadius: 10,
            growthFactor: 3.5,
            glowRadiusFactor: 2.5,
            glowOpacity: 0.2,
            blurAmount: "15px",
            labelOffset: 35,
            activeStroke: "#ffffff",
            inactiveStroke: "#1d4ed8",
            labelSize: "12px",
            countSize: "9px",
            labelColor: "#94a3b8",
            labelColorActive: "#ffffff",
        },
        charts: {
            radar: {
                gridColor: "#334155",
                labelColor: "#94a3b8",
                labelSize: 10,
                fillOpacity: 0.4,
            },
            bar: {
                axisColor: "#94a3b8",
                axisSize: 10,
                tooltipBg: "#0f172a",
                tooltipBorder: "#334155",
            }
        }
    },

    // 6. Global Functional Helpers
    utils: {
        // Dynamic logic for visualization properties
        calcNodeRadius: (paperCount: number) => {
            return theme.viz.nodes.baseRadius + (paperCount * theme.viz.nodes.growthFactor);
        },
        getLinkWidth: (strength: number) => {
            return strength * theme.viz.map.links.baseWidth * 4;
        }
    },

    // 7. Animations
    animation: {
        pulse: "animate-pulse",
        spin: "animate-spin",
        fastTransition: "transition-all duration-200",
        slowTransition: "transition-all duration-500",
    }
};
