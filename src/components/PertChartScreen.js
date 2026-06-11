import React, { useContext, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Line, Circle, G, Defs, Marker, Path, Polygon } from 'react-native-svg';
import { I18nContext } from '../i18n';
import useStore from '../store/useStore';
import { computeCriticalPath } from '../utils/criticalPath';
import ProjectSwitcher from './ProjectSwitcher';

const NODE_W = 120;
const NODE_H = 72;
const H_GAP = 60;
const V_GAP = 30;

const EMPTY_ARR = [];

export default function PertChartScreen() {
  const { t } = useContext(I18nContext);
  const projectId = useStore(s => s.currentProjectId);
  const tasks = useStore(s => s.tasksByProject[s.currentProjectId] || EMPTY_ARR);
  const [scale, setScale] = useState(1);

  const cpResult = useMemo(() => computeCriticalPath(tasks), [tasks, projectId]);
  const nodes = cpResult?.nodes || [];
  const criticalIds = cpResult?.criticalIds || [];

  const layout = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return { positions: {}, edges: [], svgW: 300, svgH: 300 };
    }

    const levelArr = {};
    const assigned = {};
    let maxLvl = 0;

    // Build level map from topological order
    const nodeIdSet = new Map();
    nodes.forEach(n => nodeIdSet.set(n.id, n));

    for (const n of nodes) {
      if (!n.predecessors || n.predecessors.length === 0) {
        assigned[n.id] = 0;
      } else {
        let maxPred = -1;
        for (const p of n.predecessors) {
          if (assigned[p] !== undefined) maxPred = Math.max(maxPred, assigned[p]);
        }
        assigned[n.id] = maxPred >= 0 ? maxPred + 1 : 0;
      }
      if (assigned[n.id] > maxLvl) maxLvl = assigned[n.id];
    }

    // Group by level
    const levels = [];
    for (let i = 0; i <= maxLvl; i++) {
      levels.push(nodes.filter(n => assigned[n.id] === i));
    }

    const svgW = Math.max(300, (maxLvl + 1) * (NODE_W + H_GAP) + H_GAP);
    let maxNodes = 1;
    levels.forEach(l => { if (l.length > maxNodes) maxNodes = l.length; });
    const svgH = Math.max(300, maxNodes * (NODE_H + V_GAP) + V_GAP);

    const positions = {};
    levels.forEach((l, li) => {
      const x = H_GAP + li * (NODE_W + H_GAP);
      const totalH = l.length * (NODE_H + V_GAP);
      const startY = Math.max(0, (svgH - totalH) / 2 + V_GAP / 2);
      l.forEach((n, ni) => {
        positions[n.id] = { x, y: startY + ni * (NODE_H + V_GAP) };
      });
    });

    // Build edges
    const edges = [];
    nodes.forEach(n => {
      if (n.predecessors) {
        n.predecessors.forEach(p => {
          const from = positions[p];
          const to = positions[n.id];
          if (from && to) {
            edges.push({
              x1: from.x + NODE_W,
              y1: from.y + NODE_H / 2,
              x2: to.x,
              y2: to.y + NODE_H / 2,
              critical: criticalIds.includes(p) && criticalIds.includes(n.id),
            });
          }
        });
      }
    });

    return { positions, edges, svgW, svgH };
  }, [nodes, criticalIds]);

  if (!nodes || nodes.length === 0) {
    return (
      <View style={s.c}>
        <ProjectSwitcher />
        <View style={s.ctrl}>
          <TouchableOpacity style={s.ctBtn} disabled>
            <Text style={s.ctT}>−</Text>
          </TouchableOpacity>
          <Text style={s.ctL}>100%</Text>
          <TouchableOpacity style={s.ctBtn} disabled>
            <Text style={s.ctT}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyT}>{t('common.noData')}</Text>
        </View>
        <View style={s.leg}>
          <View style={s.legRow}><View style={[s.legDot, { backgroundColor: '#16213e', borderColor: '#0f3460' }]} /><Text style={s.legT}>{t('pert.normalTask')}</Text></View>
          <View style={s.legRow}><View style={[s.legDot, { backgroundColor: '#16213e', borderColor: '#e94560' }]} /><Text style={s.legT}>{t('pert.criticalTask')}</Text></View>
        </View>
      </View>
    );
  }

  const sw = Math.max(layout.svgW * scale, 300);
  const sh = Math.max(layout.svgH * scale, 300);

  return (
    <View style={s.c}>
      <ProjectSwitcher />
      <View style={s.ctrl}>
        <TouchableOpacity style={s.ctBtn} onPress={() => setScale(s => Math.max(0.4, s - 0.2))}>
          <Text style={s.ctT}>− {t('gantt.zoomOut')}</Text>
        </TouchableOpacity>
        <Text style={s.ctL}>{Math.round(scale * 100)}%</Text>
        <TouchableOpacity style={s.ctBtn} onPress={() => setScale(s => Math.min(2, s + 0.2))}>
          <Text style={s.ctT}>+ {t('gantt.zoomIn')}</Text>
        </TouchableOpacity>
        <Text style={s.countT}>{nodes.length} {t('pert.task')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <ScrollView showsVerticalScrollIndicator>
          <Svg width={sw} height={sh}>
            <Defs>
              <Marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
                <Path d="M0,0 L8,4 L0,8" fill="#4a4a6a" />
              </Marker>
              <Marker id="arrowCrit" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                <Path d="M0,0 L10,5 L0,10" fill="#e94560" />
              </Marker>
            </Defs>

            {/* Edges */}
            {layout.edges.map((e, i) => (
              <Line
                key={'e' + i}
                x1={e.x1 * scale} y1={e.y1 * scale}
                x2={e.x2 * scale} y2={e.y2 * scale}
                stroke={e.critical ? '#e94560' : '#4a4a6a'}
                strokeWidth={e.critical ? 3 : 1.5}
                markerEnd={e.critical ? 'url(#arrowCrit)' : 'url(#arrow)'}
              />
            ))}

            {/* Nodes */}
            {nodes.map(n => {
              const pos = layout.positions[n.id];
              if (!pos) return null;
              const x = pos.x * scale;
              const y = pos.y * scale;
              const w = NODE_W * scale;
              const h = NODE_H * scale;
              const isCrit = criticalIds.includes(n.id);

              if (n.isMilestone) {
                return (
                  <G key={n.id}>
                    <Circle
                      cx={x + w / 2} cy={y + h / 2} r={Math.max(12, w / 4)}
                      fill="#16213e" stroke="#f39c12" strokeWidth={2 * scale}
                    />
                    <SvgText
                      x={x + w / 2} y={y + h / 2 + 4 * scale}
                      fill="#f39c12" fontSize={Math.max(8, 11 * scale)}
                      textAnchor="middle" fontWeight="bold"
                    >
                      ◆
                    </SvgText>
                    <SvgText
                      x={x + w / 2} y={y + h + 14 * scale}
                      fill="#f39c12" fontSize={Math.max(8, 10 * scale)}
                      textAnchor="middle" fontWeight="bold"
                    >
                      {n.name || ''}
                    </SvgText>
                  </G>
                );
              }

              const fs = Math.max(7, 10 * scale);
              return (
                <G key={n.id}>
                  <Rect
                    x={x} y={y} width={w} height={h} rx={6 * scale}
                    fill="#16213e" stroke={isCrit ? '#e94560' : '#0f3460'}
                    strokeWidth={isCrit ? 3 * scale : 1.5 * scale}
                  />
                  <SvgText x={x + w / 2} y={y + 14 * scale} fill="#fff" fontSize={fs} textAnchor="middle" fontWeight="bold">
                    {(n.name || '').length > 8 ? (n.name || '').slice(0, 7) + '..' : (n.name || '')}
                  </SvgText>
                  <SvgText x={x + 4 * scale} y={y + 24 * scale} fill="#2ecc71" fontSize={fs * 0.8}>ES:{n.es ?? '?'}</SvgText>
                  <SvgText x={x + w - 4 * scale} y={y + 24 * scale} fill="#2ecc71" fontSize={fs * 0.8} textAnchor="end">EF:{n.ef ?? '?'}</SvgText>
                  <SvgText x={x + w / 2} y={y + 38 * scale} fill="#fff" fontSize={fs * 1.1} textAnchor="middle" fontWeight="bold">
                    {n.duration ?? '?'}d
                  </SvgText>
                  <SvgText x={x + 4 * scale} y={y + h - 18 * scale} fill="#e74c3c" fontSize={fs * 0.75}>LS:{n.ls ?? '?'}</SvgText>
                  <SvgText x={x + w - 4 * scale} y={y + h - 18 * scale} fill="#e74c3c" fontSize={fs * 0.75} textAnchor="end">LF:{n.lf ?? '?'}</SvgText>
                  <SvgText x={x + w / 2} y={y + h - 4 * scale} fill={n.float === 0 ? '#e94560' : '#f39c12'} fontSize={fs * 0.8} textAnchor="middle">
                    F:{n.float ?? '?'}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      </ScrollView>

      <View style={s.leg}>
        <View style={s.legRow}><View style={[s.legDot, { backgroundColor: '#16213e', borderColor: '#0f3460' }]} /><Text style={s.legT}>{t('pert.normalTask')}</Text></View>
        <View style={s.legRow}><View style={[s.legDot, { backgroundColor: '#16213e', borderColor: '#e94560' }]} /><Text style={s.legT}>{t('pert.criticalTask')}</Text></View>
        <View style={s.legRow}><View style={[s.legDot, { backgroundColor: '#16213e', borderColor: '#f39c12', borderRadius: 8 }]} /><Text style={s.legT}>{t('pert.milestone')}</Text></View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#1a1a2e' },
  ctrl: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#16213e', gap: 8 },
  ctBtn: { backgroundColor: '#0f3460', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  ctT: { color: '#fff', fontSize: 12 },
  ctL: { color: '#fff', fontSize: 13, minWidth: 36, textAlign: 'center' },
  countT: { color: '#666', fontSize: 11, marginLeft: 'auto' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyT: { color: '#a0a0b0', fontSize: 16 },
  leg: { flexDirection: 'row', justifyContent: 'center', padding: 10, gap: 16, backgroundColor: '#16213e' },
  legRow: { flexDirection: 'row', alignItems: 'center' },
  legDot: { width: 12, height: 12, borderWidth: 2, borderRadius: 2, marginRight: 4 },
  legT: { color: '#a0a0b0', fontSize: 11 },
});
