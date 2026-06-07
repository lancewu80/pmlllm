import React, { useContext, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { I18nContext } from '../i18n';
import useStore from '../store/useStore';
import { computeCriticalPath } from '../utils/criticalPath';

const BAR_H = 28;
const ROW_H = 44;
const LABEL_W = 130;
const HEADER_H = 44;

export default function GanttChartScreen() {
  const { t } = useContext(I18nContext);
  const tasks = useStore(s => s.currentTasks);
  const users = useStore(s => s.users);
  const projectId = useStore(s => s.currentProjectId);
  const key = projectId;
  const [zoom, setZoom] = useState(1);
  const [critOnly, setCritOnly] = useState(false);

  const { nodes, criticalIds, numDays, baseMs } = useMemo(
    () => computeCriticalPath(tasks),
    [tasks]
  );

  // Compute display items: tasks augmented with CPM data
  const displayItems = useMemo(() => {
    if (nodes.length === 0) return [];
    const critSet = new Set(criticalIds);
    const filtered = critOnly ? nodes.filter(n => critSet.has(n.id) && !n.isMilestone) : nodes;
    return filtered.map(n => ({
      ...n,
      isCrit: critSet.has(n.id),
      assigneeName: users.find(u => u.id === (n.assigneeId || n.assignee))?.name || '',
    }));
  }, [nodes, criticalIds, critOnly, users]);

  if (displayItems.length === 0) {
    return (
      <View key={projectId} style={s.c}>
        <View style={s.ctrl}>
          <TouchableOpacity style={s.ctBtn} onPress={() => setZoom(z => Math.max(0.5, z - 0.25))}>
            <Text style={s.ctT}>− {t('gantt.zoomOut')}</Text>
          </TouchableOpacity>
          <Text style={s.ctL}>{Math.round(zoom * 100)}%</Text>
          <TouchableOpacity style={s.ctBtn} onPress={() => setZoom(z => Math.min(4, z + 0.25))}>
            <Text style={s.ctT}>+ {t('gantt.zoomIn')}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.emptyC}>
          <Text style={s.emptyT}>{t('common.noData')}</Text>
          {tasks.length === 0 && projectId && (
            <Text style={s.emptySub}>Add tasks in the Tasks tab to see the Gantt chart.</Text>
          )}
        </View>
      </View>
    );
  }

  const dayW = 24 * zoom;
  const chartW = Math.max(numDays * dayW, Dimensions.get('window').width - LABEL_W);
  const totalH = HEADER_H + displayItems.length * ROW_H + 30;

  // Generate headers
  const dayHeaders = [];
  for (let d = 0; d < numDays; d++) {
    const dt = new Date(baseMs + d * 86400000);
    dayHeaders.push({
      label: `${dt.getMonth() + 1}/${dt.getDate()}`,
      isSunday: dt.getDay() === 0,
      isMonday: dt.getDay() === 1,
    });
  }

  return (
    <View key={projectId} style={s.c}>
      {/* Controls */}
      <View style={s.ctrl}>
        <TouchableOpacity style={s.ctBtn} onPress={() => setZoom(z => Math.max(0.5, z - 0.25))}>
          <Text style={s.ctT}>− {t('gantt.zoomOut')}</Text>
        </TouchableOpacity>
        <Text style={s.ctL}>{Math.round(zoom * 100)}%</Text>
        <TouchableOpacity style={s.ctBtn} onPress={() => setZoom(z => Math.min(4, z + 0.25))}>
          <Text style={s.ctT}>+ {t('gantt.zoomIn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.ctBtn, critOnly && s.ctBtnA]} onPress={() => setCritOnly(!critOnly)}>
          <Text style={[s.ctT, critOnly && { color: '#e94560' }]}>{t('gantt.criticalPathLabel')}</Text>
        </TouchableOpacity>
        <Text style={s.taskCount}>{displayItems.length} {t('gantt.tasks')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* Header row */}
          <View style={[s.headerRow, { marginLeft: LABEL_W, width: chartW }]}>
            {dayHeaders.map((d, i) => (
              <View key={i} style={[s.dayH, { width: dayW }, d.isSunday && { backgroundColor: 'rgba(233,69,96,0.04)' }]}>
                <Text style={[s.dayHT, d.isSunday && { color: '#e94560' }]}>{d.label}</Text>
              </View>
            ))}
          </View>

          {/* Task rows */}
          {displayItems.map((n, idx) => {
            const barLeft = n.es * dayW + LABEL_W;
            const barW = Math.max(n.duration * dayW, dayW);

            return (
              <View key={n.id} style={[s.taskRow, { width: chartW + LABEL_W }]}>
                {/* Left label */}
                <View style={s.taskLabel}>
                  <Text style={s.taskName} numberOfLines={1}>{n.name}</Text>
                  {n.assigneeName ? <Text style={s.taskAss} numberOfLines={1}>{n.assigneeName}</Text> : null}
                </View>

                {/* Chart area */}
                <View style={{ width: chartW }}>
                  {/* Baseline tick */}
                  <View style={[s.barBase, { left: barLeft, width: barW }]}>
                    {/* Progress fill */}
                    {!n.isMilestone && n.progress > 0 && (
                      <View style={[s.progFill, { width: `${n.progress}%` }]} />
                    )}
                    {/* Label */}
                    <View style={s.barContent}>
                      {n.isMilestone ? (
                        <Text style={s.milestoneIcon}>◆</Text>
                      ) : (
                        <>
                          <Text style={s.barLabel}>{n.name}</Text>
                          <Text style={s.barDuration}>{n.duration}d</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Today marker */}
          {baseMs && (
            (() => {
              const todayMs = Date.now();
              const todayDay = Math.round((todayMs - baseMs) / 86400000);
              if (todayDay >= 0 && todayDay < numDays) {
                return <View style={[s.todayLine, { left: todayDay * dayW + LABEL_W, height: totalH }]} />;
              }
              return null;
            })()
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#1a1a2e' },
  emptyC: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyT: { color: '#a0a0b0', fontSize: 16 },
  emptySub: { color: '#666', fontSize: 13, marginTop: 8, textAlign: 'center' },
  ctrl: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#16213e', gap: 8, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  ctBtn: { backgroundColor: '#0f3460', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  ctBtnA: { backgroundColor: 'rgba(233,69,96,0.2)' },
  ctT: { color: '#fff', fontSize: 12 },
  ctL: { color: '#fff', fontSize: 12, minWidth: 36, textAlign: 'center' },
  taskCount: { color: '#666', fontSize: 11, marginLeft: 'auto' },
  headerRow: { flexDirection: 'row', height: HEADER_H, alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  dayH: { alignItems: 'center', justifyContent: 'center', paddingBottom: 2 },
  dayHT: { color: '#888', fontSize: 9 },
  taskRow: { flexDirection: 'row', height: ROW_H, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', alignItems: 'center' },
  taskLabel: { width: LABEL_W, paddingLeft: 8, justifyContent: 'center', paddingRight: 4 },
  taskName: { color: '#fff', fontSize: 12, fontWeight: '500' },
  taskAss: { color: '#666', fontSize: 9, marginTop: 1 },
  barBase: { position: 'absolute', height: BAR_H, borderRadius: 4, backgroundColor: '#16213e', borderWidth: 1, borderColor: '#0f3460', overflow: 'hidden', justifyContent: 'center', top: (ROW_H - BAR_H) / 2 },
  progFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#e94560', borderRadius: 3 },
  barContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, zIndex: 1 },
  barLabel: { color: '#fff', fontSize: 10, fontWeight: '600', flex: 1 },
  barDuration: { color: 'rgba(255,255,255,0.6)', fontSize: 9, marginLeft: 4 },
  milestoneIcon: { color: '#f39c12', fontSize: 16 },
  todayLine: { position: 'absolute', top: 0, width: 2, backgroundColor: '#e94560', opacity: 0.6, zIndex: 10 },
});
