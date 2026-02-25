// ═══════════════════════════════════════════════════════════════
// ConstellationCanvas — D3 force-simulation knowledge graph
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { theme } from "../design/theme";
import type {
    GraphNode,
    GraphEdge,
    Orientation,
    EpistemicEdgeType,
} from "../types/keyword";
import {
    ORIENTATION_COLORS,
    EDGE_TYPE_COLORS,
} from "../types/keyword";

// ─── D3 simulation node type ─────────────────────────────────

interface SimNode extends d3.SimulationNodeDatum {
    id: string;
    term: string;
    orientation: Orientation;
    frequency: number;
    weight: number;
    active: boolean;
    sourcePapers: string[];
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
    finalWeight: number;
    edgeType: EpistemicEdgeType;
}

interface Region {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
}

// ─── Props ───────────────────────────────────────────────────

interface ConstellationCanvasProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    selectedId?: string | null;
    onNodeClick?: (node: GraphNode) => void;
    onPaneClick?: () => void;
}

// ─── Node sizing ─────────────────────────────────────────────

function nodeRadius(n: SimNode): number {
    return 8 + n.frequency * 3 + n.weight * 4;
}

function glowRadius(n: SimNode): number {
    return nodeRadius(n) + 12 + n.frequency * 4;
}

// ─── Component ───────────────────────────────────────────────

export default function ConstellationCanvas({
    nodes,
    edges,
    selectedId,
    onNodeClick,
    onPaneClick,
}: ConstellationCanvasProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

    // Convert to sim-friendly shapes
    const simNodes: SimNode[] = nodes.map((n) => ({
        id: n.id,
        term: n.term,
        orientation: n.orientation,
        frequency: n.frequency,
        weight: n.weight,
        active: n.active,
        sourcePapers: n.sourcePapers,
    }));

    const simLinks: SimLink[] = edges
        .filter(
            (e) =>
                nodes.some((n) => n.id === e.source) &&
                nodes.some((n) => n.id === e.target),
        )
        .map((e) => ({
            source: e.source,
            target: e.target,
            finalWeight: e.finalWeight,
            edgeType: e.edgeType,
        }));

    // Stable callbacks
    const handleNodeClick = useCallback(
        (n: SimNode) => {
            if (onNodeClick) {
                const original = nodes.find((gn) => gn.id === n.id);
                if (original) onNodeClick(original);
            }
        },
        [nodes, onNodeClick],
    );

    const handlePaneClick = useCallback(() => {
        if (onPaneClick) onPaneClick();
    }, [onPaneClick]);

    // ── D3 rendering ─────────────────────────────────────────
    useEffect(() => {
        if (!svgRef.current || simNodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        svg.selectAll("*").remove();

        const pad = 24;
        const regionWidth = (width - pad * 3) / 2;
        const regionHeight = (height - pad * 3) / 2;
        const regions: Record<Orientation, Region> = {
            exploratory: {
                x: pad,
                y: pad,
                width: regionWidth,
                height: regionHeight,
                label: "EXPLORATORY",
            },
            critical: {
                x: pad * 2 + regionWidth,
                y: pad,
                width: regionWidth,
                height: regionHeight,
                label: "CRITICAL",
            },
            problem_solving: {
                x: pad,
                y: pad * 2 + regionHeight,
                width: regionWidth,
                height: regionHeight,
                label: "PROBLEM SOLVING",
            },
            constructive: {
                x: pad * 2 + regionWidth,
                y: pad * 2 + regionHeight,
                width: regionWidth,
                height: regionHeight,
                label: "CONSTRUCTIVE",
            },
        };

        const centerOf = (orientation: Orientation) => {
            const r = regions[orientation];
            return {
                x: r.x + r.width / 2,
                y: r.y + r.height / 2,
            };
        };

        // ── Defs: arrow markers for edge types ───────────────
        const defs = svg.append("defs");

        (
            Object.entries(EDGE_TYPE_COLORS) as [EpistemicEdgeType, string][]
        ).forEach(([type, color]) => {
            defs.append("marker")
                .attr("id", `arrow-${type}`)
                .attr("viewBox", "0 0 10 10")
                .attr("refX", 20)
                .attr("refY", 5)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto-start-reverse")
                .append("path")
                .attr("d", "M 0 0 L 10 5 L 0 10 z")
                .attr("fill", color)
                .attr("fill-opacity", 0.5);
        });

        // ── Filter: glow ─────────────────────────────────────
        const glowFilter = defs.append("filter").attr("id", "glow");
        glowFilter
            .append("feGaussianBlur")
            .attr("stdDeviation", "6")
            .attr("result", "blur");
        const feMerge = glowFilter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "blur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        // ── Root group with zoom ─────────────────────────────
        const g = svg.append("g");

        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.15, 4])
            .on("zoom", (event) => g.attr("transform", event.transform));

        svg.call(zoom);

        // Click on empty space
        svg.on("click", (event) => {
            if (event.target === svgRef.current) handlePaneClick();
        });

        // ── Orientation regions ────────────────────────────
        const regionG = g.append("g").attr("class", "regions");

        (Object.keys(regions) as Orientation[]).forEach((key) => {
            const region = regions[key];
            regionG
                .append("rect")
                .attr("x", region.x)
                .attr("y", region.y)
                .attr("width", region.width)
                .attr("height", region.height)
                .attr("rx", 16)
                .attr("fill", `${ORIENTATION_COLORS[key]}14`)
                .attr("stroke", `${ORIENTATION_COLORS[key]}66`)
                .attr("stroke-width", 1.2)
                .attr("stroke-dasharray", "6 6");

            regionG
                .append("text")
                .attr("x", region.x + 14)
                .attr("y", region.y + 22)
                .text(region.label)
                .attr("fill", ORIENTATION_COLORS[key])
                .attr("font-size", "11px")
                .attr("font-weight", "800")
                .style("letter-spacing", "0.12em")
                .style("pointer-events", "none");
        });

        // ── Simulation ─────────────────────────────────────
        const simulation = d3
            .forceSimulation<SimNode>(simNodes)
            .force(
                "link",
                d3
                    .forceLink<SimNode, SimLink>(simLinks)
                    .id((d) => d.id)
                    .distance(160)
                    .strength((d) => d.finalWeight * 0.5),
            )
            .force("charge", d3.forceManyBody().strength(-800))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force(
                "x",
                d3
                    .forceX<SimNode>((d) => centerOf(d.orientation).x)
                    .strength(0.18),
            )
            .force(
                "y",
                d3
                    .forceY<SimNode>((d) => centerOf(d.orientation).y)
                    .strength(0.18),
            )
            .force(
                "collision",
                d3
                    .forceCollide<SimNode>()
                    .radius((d) => nodeRadius(d) + 20),
            )
            .velocityDecay(0.4);

        simulationRef.current = simulation;

        // ── Links ──────────────────────────────────────────
        const linkG = g
            .append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(simLinks)
            .join("line")
            .attr(
                "stroke",
                (d) => EDGE_TYPE_COLORS[d.edgeType] ?? "#1e293b",
            )
            .attr("stroke-opacity", (d) =>
                d.finalWeight > 0.3 ? 0.6 : 0.25,
            )
            .attr("stroke-width", (d) =>
                Math.max(1, d.finalWeight * 6),
            )
            .attr(
                "marker-end",
                (d) => `url(#arrow-${d.edgeType})`,
            );

        // ── Node groups ────────────────────────────────────
        const nodeG = g
            .append("g")
            .attr("class", "nodes")
            .selectAll<SVGGElement, SimNode>("g")
            .data(simNodes)
            .join("g")
            .style("cursor", "pointer")
            .on("click", (_event, d) => handleNodeClick(d))
            .call(
                d3
                    .drag<SVGGElement, SimNode>()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended),
            );

        // Outer glow circle
        nodeG
            .append("circle")
            .attr("class", "glow")
            .attr("r", (d) => glowRadius(d))
            .attr("fill", (d) => ORIENTATION_COLORS[d.orientation])
            .attr("fill-opacity", 0.08)
            .style("filter", "url(#glow)");

        // Core circle
        nodeG
            .append("circle")
            .attr("class", "core")
            .attr("r", (d) => nodeRadius(d))
            .attr("fill", (d) =>
                d.active
                    ? ORIENTATION_COLORS[d.orientation]
                    : `${ORIENTATION_COLORS[d.orientation]}44`,
            )
            .attr("stroke", (d) =>
                d.id === selectedId ? "#ffffff" : ORIENTATION_COLORS[d.orientation],
            )
            .attr("stroke-width", (d) => (d.id === selectedId ? 3 : 1.5))
            .attr("stroke-opacity", (d) => (d.active ? 1 : 0.3));

        // Keyword label
        nodeG
            .append("text")
            .attr("dy", (d) => nodeRadius(d) + 16)
            .attr("text-anchor", "middle")
            .text((d) => d.term)
            .attr("fill", (d) =>
                d.id === selectedId ? "#ffffff" : "#94a3b8",
            )
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .style("text-transform", "uppercase")
            .style("letter-spacing", "0.05em")
            .style("pointer-events", "none")
            .style("text-shadow", "0 2px 4px rgba(0,0,0,0.9)");

        // Frequency badge (only for freq > 1)
        nodeG
            .filter((d) => d.frequency > 1)
            .append("text")
            .attr("dy", (d) => nodeRadius(d) + 28)
            .attr("text-anchor", "middle")
            .text((d) => `×${d.frequency}`)
            .attr("fill", "#64748b")
            .attr("font-size", "9px")
            .attr("font-family", theme.fonts?.mono ?? "monospace")
            .style("pointer-events", "none");

        // ── Floating animation via gentle force reheat ─────
        const floatTimer = d3.interval(() => {
            simulation.alpha(0.05).restart();
        }, 3000);

        // ── Tick ─────────────────────────────────────────
        simulation.on("tick", () => {
            linkG
                .attr("x1", (d) => (d.source as SimNode).x!)
                .attr("y1", (d) => (d.source as SimNode).y!)
                .attr("x2", (d) => (d.target as SimNode).x!)
                .attr("y2", (d) => (d.target as SimNode).y!);

            nodeG.attr("transform", (d) => `translate(${d.x},${d.y})`);
        });

        // ── Drag handlers ────────────────────────────────
        function dragstarted(event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        function dragged(event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        function dragended(event: d3.D3DragEvent<SVGGElement, SimNode, SimNode>) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return () => {
            floatTimer.stop();
            simulation.stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges, selectedId]);

    // ── Update selected highlight without rebuilding ──────
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);

        svg.selectAll<SVGCircleElement, SimNode>(".core")
            .attr("stroke", (d) =>
                d.id === selectedId ? "#ffffff" : ORIENTATION_COLORS[d.orientation],
            )
            .attr("stroke-width", (d) => (d.id === selectedId ? 3 : 1.5));

        svg.selectAll<SVGCircleElement, SimNode>(".glow")
            .attr("fill-opacity", (d) =>
                d.id === selectedId ? 0.25 : 0.08,
            );

        svg.selectAll<SVGTextElement, SimNode>("text")
            .filter(function () {
                return (
                    d3.select(this).attr("font-size") === "11px"
                );
            })
            .attr("fill", (d) =>
                d.id === selectedId ? "#ffffff" : "#94a3b8",
            );
    }, [selectedId]);

    return (
        <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ background: theme.layout.canvasBg }}
        />
    );
}
