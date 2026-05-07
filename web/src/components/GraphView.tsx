import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { api, Graph, GraphNode } from '../api/client';

interface GraphViewProps {
  vaultPath: string;
}

type SimNode = d3.SimulationNodeDatum & GraphNode;
type SimLink = d3.SimulationLinkDatum<SimNode>;

export default function GraphView({ vaultPath }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!vaultPath) return;
    setLoading(true);
    api.graph.get(vaultPath).then(res => {
      setGraph(res.graph);
      setLoading(false);
    }).catch(() => {
      setGraph(null);
      setLoading(false);
    });
  }, [vaultPath]);

  useEffect(() => {
    if (!svgRef.current || !graph || graph.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll('*').remove();

    const nodes: SimNode[] = graph.nodes.map(n => ({ ...n }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const links: SimLink[] = graph.edges
      .filter(e => nodeMap.has(e.source as string) && nodeMap.has(e.target as string))
      .map(e => ({ source: e.source as string, target: e.target as string }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(30));

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

    const g = svg.append('g');

    const linkElements = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--border)')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    const nodeElements = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 8)
      .attr('fill', (d: SimNode) => d.id === selected ? 'var(--accent)' : 'var(--accent)')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('opacity', (d: SimNode) => selected && d.id !== selected ? 0.3 : 1)
      .style('cursor', 'pointer')
      .on('click', (_event: unknown, d: SimNode) => {
        setSelected(d.id);
        nodeElements.attr('opacity', (n: SimNode) => n.id === d.id ? 1 : 0.3);
        linkElements.attr('opacity', (l: SimLink) => {
          const s = typeof l.source === 'object' ? (l.source as SimNode).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as SimNode).id : l.target;
          return s === d.id || t === d.id ? 1 : 0.1;
        });
      });

    const labels = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d: SimNode) => d.label)
      .attr('font-size', '11px')
      .attr('dx', 12)
      .attr('dy', 4)
      .attr('fill', 'var(--text)')
      .attr('opacity', (d: SimNode) => selected && d.id !== selected ? 0.3 : 0.8);

    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d: SimLink) => (d.source as SimNode).x!)
        .attr('y1', (d: SimLink) => (d.source as SimNode).y!)
        .attr('x2', (d: SimLink) => (d.target as SimNode).x!)
        .attr('y2', (d: SimLink) => (d.target as SimNode).y!);
      nodeElements
        .attr('cx', (d: SimNode) => d.x!)
        .attr('cy', (d: SimNode) => d.y!);
      labels
        .attr('x', (d: SimNode) => d.x!)
        .attr('y', (d: SimNode) => d.y!);
    });

    return () => { simulation.stop(); };
  }, [graph, selected]);

  if (!vaultPath) {
    return <div className="content-area"><div className="empty-state"><h2>Selecione um vault</h2><p>Escolha um vault para ver o grafo</p></div></div>;
  }

  if (loading) return <div className="content-area"><p>Carregando grafo...</p></div>;

  if (!graph || graph.nodes.length === 0) {
    return <div className="content-area"><div className="empty-state"><h2>Grafo vazio</h2><p>Crie notas com links para ver o grafo</p></div></div>;
  }

  return (
    <div className="content-area" style={{ padding: 0 }}>
      <div className="toolbar">
        <strong>Grafo de conhecimento</strong>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {graph.nodes.length} nós · {graph.edges.length} arestas
        </span>
        {selected && (
          <button onClick={() => setSelected(null)} style={{ marginLeft: 'auto' }}>Limpar seleção</button>
        )}
      </div>
      <svg ref={svgRef} className="graph-container" />
    </div>
  );
}
