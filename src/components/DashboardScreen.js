import React, { useContext } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { I18nContext } from '../i18n';
import useStore from '../store/useStore';
import { computeCriticalPath } from '../utils/criticalPath';

export default function DashboardScreen({ navigation }) {
  const { t } = useContext(I18nContext);
  const project = useStore(s => s.currentProject);
  const tasks = useStore(s => s.currentTasks);
  const users = useStore(s => s.users);
  const projectId = useStore(s => s.currentProjectId);
  const resetToSample = useStore(s => s.resetToSample);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((x) => x.status === 'completed').length;
  const inProgressTasks = tasks.filter((x) => x.status === 'inProgress').length;
  const overdueTasks = tasks.filter((x) => {
    if (x.status === 'completed') return false;
    const now = new Date();
    const d = new Date(x.endDate);
    return d < now;
  }).length;

  const totalUsers = users.length;
  const { totalDuration, criticalIds } = computeCriticalPath(tasks);
  const milestones = tasks.filter((x) => x.isMilestone).slice(0, 5);

  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const roleColors = { admin: '#e94560', manager: '#f39c12', member: '#3498db', viewer: '#95a5a6' };

  return (
    <ScrollView key={projectId} style={s.c} contentContainerStyle={s.cc}>
      {/* Header */}
      <View style={s.h}>
        <Text style={s.hT}>{project.name}</Text>
        <Text style={s.hS}>{t('project.status' + project.status.charAt(0).toUpperCase() + project.status.slice(1))}</Text>
      </View>

      {/* Progress */}
      <View style={s.card}>
        <Text style={s.cardT}>{t('dashboard.projectProgress')}</Text>
        <View style={s.pb}>
          <View style={[s.pf, { width: pct + '%' }]} />
        </View>
        <Text style={s.pL}>{pct}%</Text>
      </View>

      {/* Stat Grid */}
      <View style={s.grid}>
        <View style={s.stat}><Text style={s.statV}>{totalTasks}</Text><Text style={s.statL}>{t('dashboard.totalTasks')}</Text></View>
        <View style={s.stat}><Text style={[s.statV, { color: '#2ecc71' }]}>{completedTasks}</Text><Text style={s.statL}>{t('dashboard.completedTasks')}</Text></View>
        <View style={s.stat}><Text style={[s.statV, { color: '#3498db' }]}>{inProgressTasks}</Text><Text style={s.statL}>{t('dashboard.inProgressTasks')}</Text></View>
        <View style={s.stat}><Text style={[s.statV, { color: '#e74c3c' }]}>{overdueTasks}</Text><Text style={s.statL}>{t('dashboard.overdueTasks')}</Text></View>
      </View>

      {/* Users */}
      <View style={s.card}>
        <Text style={s.cardT}>{t('dashboard.totalUsers')}: {totalUsers}</Text>
      </View>

      {/* Critical Path */}
      <TouchableOpacity style={s.card} onPress={() => navigation && navigation.navigate('criticalpath')}>
        <Text style={s.cardT}>{t('dashboard.criticalPathInfo')}</Text>
        <Text style={s.cardN}>{t('criticalPath.totalDuration')}: {totalDuration} {t('project.duration').split(' ')[0]}</Text>
        <Text style={s.cardN}>{t('criticalPath.pathTasks')}: {criticalIds.length} {t('task.title')}</Text>
      </TouchableOpacity>

      {/* Milestones */}
      <View style={s.card}>
        <Text style={s.cardT}>{t('dashboard.upcomingMilestones')}</Text>
        {milestones.length === 0 && <Text style={s.muted}>{t('common.noData')}</Text>}
        {milestones.map((m) => (
          <View key={m.id} style={s.mRow}>
            <Text style={s.mD}>◆</Text>
            <View style={s.mInfo}>
              <Text style={s.mN}>{m.name}</Text>
              <Text style={s.mDate}>{m.endDate}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Workload */}
      <View style={s.card}>
        <Text style={s.cardT}>{t('dashboard.teamWorkload')}</Text>
        {users.map((u) => {
          const cnt = tasks.filter((x) => x.assigneeId === u.id && x.status !== 'completed').length;
          const max = Math.max(1, ...users.map((u2) => tasks.filter((x) => x.assigneeId === u2.id && x.status !== 'completed').length));
          const w = (cnt / max) * 100;
          return (
            <View key={u.id} style={s.wRow}>
              <View style={s.wL}>
                <View style={[s.av, { backgroundColor: roleColors[u.role] || '#95a5a6' }]}>
                  <Text style={s.avT}>{u.name[0]}</Text>
                </View>
                <Text style={s.wN}>{u.name}</Text>
              </View>
              <View style={s.wBar}><View style={[s.wF, { width: w + '%' }]} /></View>
              <Text style={s.wC}>{cnt}</Text>
            </View>
          );
        })}
      </View>

      {/* Reset */}
      <TouchableOpacity style={s.reset} onPress={resetToSample}>
        <Text style={s.resetT}>{t('common.submit')} Reset Sample Data</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#1a1a2e' },
  cc: { padding: 16 },
  h: { marginBottom: 20 },
  hT: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  hS: { color: '#e94560', fontSize: 14, marginTop: 4 },
  card: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardT: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  cardN: { color: '#a0a0b0', fontSize: 13, marginTop: 2 },
  pb: { height: 8, backgroundColor: '#0f3460', borderRadius: 4, overflow: 'hidden' },
  pf: { height: 8, backgroundColor: '#e94560', borderRadius: 4 },
  pL: { color: '#e94560', fontSize: 13, marginTop: 4, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  stat: { width: '48%', backgroundColor: '#16213e', borderRadius: 12, padding: 16, margin: '1%', alignItems: 'center' },
  statV: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  statL: { color: '#a0a0b0', fontSize: 12, marginTop: 4, textAlign: 'center' },
  muted: { color: '#a0a0b0', fontSize: 13, fontStyle: 'italic' },
  mRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mD: { color: '#f39c12', fontSize: 18, marginRight: 10 },
  mInfo: { flex: 1 },
  mN: { color: '#fff', fontSize: 14 },
  mDate: { color: '#a0a0b0', fontSize: 12 },
  wRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  wL: { flexDirection: 'row', alignItems: 'center', width: 100 },
  av: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  avT: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  wN: { color: '#fff', fontSize: 13, flex: 1 },
  wBar: { flex: 1, height: 6, backgroundColor: '#0f3460', borderRadius: 3, overflow: 'hidden', marginHorizontal: 8 },
  wF: { height: 6, backgroundColor: '#e94560', borderRadius: 3 },
  wC: { color: '#a0a0b0', fontSize: 12, width: 24, textAlign: 'right' },
  reset: { backgroundColor: '#0f3460', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  resetT: { color: '#e94560', fontSize: 14, fontWeight: '600' },
});
