// ═══════════════════════════════════════════════════════════════
// ConstellationCanvas — React Flow canvas with NOVAFRAME theme
// ═══════════════════════════════════════════════════════════════

import { useCallback, useMemo } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Handle,
    Position,
    type Node,
    type NodeTypes,
    type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

import { theme } from "../design/theme";
import type { Keyword, Orientation } from "../types/keyword";
import {
    ORIENTATION_CENTERS,
    ORIENTATION_COLORS,
    ARTIFACT_ROLE_SHAPES,
    computeNodePosition,
    computeNodeRadius,
    computeGlowRadius,
} from "../types/keyword";

// ─── Custom keyword node ─────────────────────────────────────

function KeywordNode({ data }: NodeProps) {
    const kw = data.keyword as Keyword;
    const color = ORIENTATION_COLORS[kw.orientation];
    const shape = ARTIFACT_ROLE_SHAPES[kw.artifact_role];
    const radius = computeNodeRadius(kw.weight);
    const glowR = computeGlowRadius(kw.weight);

    return (
        <div
            className={`keyword-node ${shape}`}
            style={{
                width: radius * 2,
                height: radius * 2,
                opacity: kw.active ? 1 : 0.3,
                borderColor: kw.active
                    ? theme.viz.nodes.activeStroke
                    : theme.viz.nodes.inactiveStroke,
                background: `${color}22`,
                boxShadow: kw.active
                    ? `0 0 ${theme.viz.nodes.blurAmount} ${glowR * theme.viz.nodes.glowOpacity}px ${color}`
                    : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                cursor: "pointer",
                transition: theme.animation.fastTransition.replace(
                    /transition-all\s*/,
                    "",
                ),
            }}
        >
            <Handle
                type="source"
                position={Position.Bottom}
                style={{ visibility: "hidden" }}
            />
            <span
                style={{
                    position: "absolute",
                    top: radius * 2 + 4,
                    left: "50%",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    fontSize: theme.viz.nodes.labelSize,
                    color: kw.active
                        ? theme.viz.nodes.labelColorActive
                        : theme.viz.nodes.labelColor,
                }}
            >
                {kw.term}
            </span>
        </div>
    );
}

// ─── Custom center node ──────────────────────────────────────

function CenterNode({ data }: NodeProps) {
    const orientation = data.orientation as Orientation;
    const color = ORIENTATION_COLORS[orientation];
    const label = orientation.replace("_", " ");

    return (
        <div
            style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                border: `2px solid ${color}`,
                background: `${color}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 30px ${color}44`,
            }}
        >
            <span
                className={theme.typography.label}
                style={{ color, textAlign: "center", lineHeight: 1.2 }}
            >
                {label}
            </span>
        </div>
    );
}

const nodeTypes: NodeTypes = {
    keyword: KeywordNode,
    center: CenterNode,
};

// ─── Props ───────────────────────────────────────────────────

interface ConstellationCanvasProps {
    keywords: Keyword[];
    onNodeClick?: (keyword: Keyword) => void;
    onPaneClick?: () => void;
}

// ─── Component ───────────────────────────────────────────────

export default function ConstellationCanvas({
    keywords,
    onNodeClick,
    onPaneClick,
}: ConstellationCanvasProps) {
    // Build centre anchor nodes
    const centerNodes: Node[] = useMemo(
        () =>
            (
                Object.entries(ORIENTATION_CENTERS) as [
                    Orientation,
                    { x: number; y: number },
                ][]
            ).map(([orientation, pos]) => ({
                id: `center-${orientation}`,
                type: "center",
                position: pos,
                draggable: false,
                selectable: false,
                data: { orientation },
            })),
        [],
    );

    // Group keywords by orientation for angular offset
    const groups = useMemo(() => {
        const map = new Map<Orientation, Keyword[]>();
        for (const kw of keywords) {
            const list = map.get(kw.orientation) ?? [];
            list.push(kw);
            map.set(kw.orientation, list);
        }
        return map;
    }, [keywords]);

    // Build keyword nodes
    const keywordNodes: Node[] = useMemo(() => {
        const nodes: Node[] = [];
        for (const [, group] of groups) {
            group.forEach((kw, idx) => {
                const pos = computeNodePosition(kw, idx, group.length);
                nodes.push({
                    id: kw.id,
                    type: "keyword",
                    position: pos,
                    data: { keyword: kw },
                });
            });
        }
        return nodes;
    }, [groups]);

    const allNodes = useMemo(
        () => [...centerNodes, ...keywordNodes],
        [centerNodes, keywordNodes],
    );

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (node.type === "keyword" && onNodeClick) {
                onNodeClick(node.data.keyword as Keyword);
            }
        },
        [onNodeClick],
    );

    return (
        <div className={`w-full h-full ${theme.layout.canvasBg}`}>
            <ReactFlow
                nodes={allNodes}
                edges={[]}
                nodeTypes={nodeTypes}
                onNodeClick={handleNodeClick}
                onPaneClick={onPaneClick}
                fitView
                minZoom={0.3}
                maxZoom={2}
            >
                <Background
                    color={theme.viz.map.links.inactiveColor}
                    gap={40}
                />
                <Controls />
                <MiniMap
                    nodeColor={(n) =>
                        n.type === "center"
                            ? ORIENTATION_COLORS[
                            n.data.orientation as Orientation
                            ]
                            : theme.viz.nodes.labelColor
                    }
                    maskColor="#020617cc"
                />
            </ReactFlow>
        </div>
    );
}
