import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useStore from '../store/useStore';

/**
 * A simple read-only banner showing the current project name.
 * Used in Gantt, PERT, CriticalPath screens.
 */
export default function ProjectBanner() {
  const projects = useStore(s => s.projects);
  const currentId = useStore(s => s.currentProjectId);
  const proj = currentId ? projects[currentId] : null;

  return (
    <View style={s.bar}>
      <Text style={s.icon}>📁</Text>
      <Text style={s.name} numberOfLines={1}>
        {proj ? proj.name : '—'}
      </Text>
      {proj?.status ? (
        <View style={[s.badge, statusColor(proj.status)]}>
          <Text style={s.badgeT}>{statusLabel(proj.status)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function statusColor(st) {
  const map = {
    planned: { backgroundColor: '#555' },
    inProgress: { backgroundColor: '#2471a3' },
    completed: { backgroundColor: '#1e8449' },
    onHold: { backgroundColor: '#b7770d' },
  };
  return map[st] || { backgroundColor: '#555' };
}

function statusLabel(st) {
  const map = { planned: '規劃中', inProgress: '進行中', completed: '已完成', onHold: '暫停' };
  return map[st] || st;
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
    gap: 8,
  },
  icon: { fontSize: 14 },
  name: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeT: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
