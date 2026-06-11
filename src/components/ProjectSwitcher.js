import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useStore from '../store/useStore';

/**
 * Shared project switcher banner.
 * Shows current project name; tap to open dropdown and switch immediately.
 * Used in Task, Dashboard, Gantt, PERT, CriticalPath screens.
 */
export default function ProjectSwitcher() {
  const projects = useStore(s => s.projects);
  const currentId = useStore(s => s.currentProjectId);
  const switchProject = useStore(s => s.switchProject);
  const [open, setOpen] = useState(false);

  const projList = Object.values(projects).sort(
    (a, b) => (a.name || '').localeCompare(b.name || '')
  );
  const curProj = projects[currentId];

  const statusLabel = { planned: '規劃中', inProgress: '進行中', completed: '已完成', onHold: '暫停' };
  const statusColor = { planned: '#555', inProgress: '#2471a3', completed: '#1e8449', onHold: '#b7770d' };

  return (
    <View>
      <TouchableOpacity style={s.bar} onPress={() => setOpen(o => !o)} activeOpacity={0.85}>
        <Text style={s.icon}>📁</Text>
        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>{curProj?.name || '—'}</Text>
          {curProj?.status ? (
            <View style={[s.badge, { backgroundColor: statusColor[curProj.status] || '#555' }]}>
              <Text style={s.badgeT}>{statusLabel[curProj.status] || curProj.status}</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.dropdown}>
          {projList.map(p => {
            const active = p.id === currentId;
            return (
              <TouchableOpacity
                key={p.id}
                style={[s.item, active && s.itemActive]}
                onPress={() => { switchProject(p.id); setOpen(false); }}
              >
                <Text style={s.itemCheck}>{active ? '✓' : ' '}</Text>
                <Text style={[s.itemT, active && s.itemTActive]} numberOfLines={1}>{p.name}</Text>
                {p.status ? (
                  <View style={[s.itemBadge, { backgroundColor: statusColor[p.status] || '#555' }]}>
                    <Text style={s.itemBadgeT}>{statusLabel[p.status] || p.status}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
    gap: 10,
  },
  icon: { fontSize: 16 },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: '#fff', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  badgeT: { color: '#fff', fontSize: 10, fontWeight: '600' },
  arrow: { color: '#a0a0b0', fontSize: 11 },

  dropdown: {
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  itemActive: { backgroundColor: '#0f3460' },
  itemCheck: { color: '#e94560', fontSize: 14, width: 16, textAlign: 'center' },
  itemT: { color: '#a0a0b0', fontSize: 14, flex: 1 },
  itemTActive: { color: '#fff', fontWeight: '600' },
  itemBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3 },
  itemBadgeT: { color: '#fff', fontSize: 10 },
});
