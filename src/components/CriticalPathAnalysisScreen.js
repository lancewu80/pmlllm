import React, { useContext, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { I18nContext } from '../i18n';
import useStore from '../store/useStore';
import { computeCriticalPath } from '../utils/criticalPath';
import ProjectSwitcher from './ProjectSwitcher';

const EMPTY_ARR = [];

export default function CriticalPathAnalysisScreen() {
  const { t } = useContext(I18nContext);
  const projectId = useStore(s => s.currentProjectId);
  const tasks = useStore(s => s.tasksByProject[s.currentProjectId] || EMPTY_ARR);
  const users = useStore(s => s.users);
  const deleteTask = useStore(s => s.deleteTask);
  const { nodes, criticalIds, totalDuration } = useMemo(() => computeCriticalPath(tasks), [tasks, projectId]);

  function confirmDelete(n) {
    if (Platform.OS === 'web') {
      if (window.confirm(`確定要刪除「${n.name}」？`)) deleteTask(n.id, n.projectId || projectId);
    } else {
      Alert.alert('確認刪除', `確定要刪除「${n.name}」？`, [
        { text: '取消', style: 'cancel' },
        { text: '刪除', style: 'destructive', onPress: () => deleteTask(n.id, n.projectId || projectId) },
      ]);
    }
  }

  const critTasks = nodes.filter((n) => criticalIds.includes(n.id));
  const nonCritTasks = nodes.filter((n) => !criticalIds.includes(n.id));

  function getUserName(id) {
    const u = users.find((x) => x.id === id);
    return u ? u.name : '-';
  }

  return (
    <View style={s.c}>
      <ProjectSwitcher />
    <ScrollView contentContainerStyle={s.cc}>
      {/* Info Card */}
      <View style={s.card}>
        <Text style={s.cardT}>{t('criticalPath.title')}</Text>
        <Text style={s.desc}>{t('criticalPath.description')}</Text>
        <Text style={s.stat}>
          {t('criticalPath.totalDuration')}: <Text style={s.hl}>{totalDuration} {t('project.duration').split(' ')[0]}</Text>
        </Text>
        <Text style={s.stat}>
          {t('criticalPath.pathTasks')}: <Text style={s.hl}>{criticalIds.length}</Text>
        </Text>
      </View>

      {/* Sequential Path View */}
      <View style={s.card}>
        <Text style={s.cardT}>{t('criticalPath.pathTasks')}</Text>
        {critTasks.map((n, i) => (
          <View key={n.id}>
            <View style={[s.node, i === 0 ? s.firstNode : {}]}>
              <View style={s.nodeH}>
                <Text style={s.nodeN}>{n.name}</Text>
                <View style={s.critBadge}><Text style={s.critBT}>{t('criticalPath.critical')}</Text></View>
                <TouchableOpacity style={s.nodeDelBtn} onPress={() => confirmDelete(n)}>
                  <Text style={s.nodeDelBtnT}>🗑</Text>
                </TouchableOpacity>
              </View>
              <View style={s.nodeRow}>
                <Text style={s.nodeL}>{getUserName(n.assignee)}</Text>
                <Text style={s.nodeL}>{n.startDate} → {n.endDate}</Text>
              </View>
              <Text style={s.nodeDur}>{n.duration} {t('project.duration').split(' ')[0]}</Text>
            </View>
            {i < critTasks.length - 1 && (
              <View style={s.arrowR}>
                <View style={s.arrow} />
                <Text style={s.arrowT}>↓</Text>
                <View style={s.arrow} />
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Full Task Table with CPM Data */}
      <View style={s.card}>
        <Text style={s.cardT}>{t('task.title')} — CPM {t('pert.title')}</Text>
        <ScrollView horizontal>
          <View>
            {/* Header */}
            <View style={[s.tRow, s.tH]}>
              <Text style={[s.tC, s.tNameC]}>{t('task.name')}</Text>
              <Text style={s.tC}>{t('pert.earlyStart')}</Text>
              <Text style={s.tC}>{t('pert.earlyFinish')}</Text>
              <Text style={s.tC}>{t('pert.lateStart')}</Text>
              <Text style={s.tC}>{t('pert.lateFinish')}</Text>
              <Text style={s.tC}>{t('pert.floatTime')}</Text>
              <Text style={s.tC}>{t('project.duration')}</Text>
              <Text style={s.tC}>{t('common.status')}</Text>
              <Text style={[s.tC, { width: 36 }]}> </Text>
            </View>
            {/* Critical tasks */}
            {critTasks.map((n) => (
              <View key={n.id} style={[s.tRow, s.critRow]}>
                <Text style={[s.tC, s.tNameC, { color: '#e94560' }]} numberOfLines={1}>{n.name}</Text>
                <Text style={s.tC}>{n.es}</Text>
                <Text style={s.tC}>{n.ef}</Text>
                <Text style={s.tC}>{n.ls}</Text>
                <Text style={s.tC}>{n.lf}</Text>
                <Text style={s.tC}>0</Text>
                <Text style={s.tC}>{n.duration}</Text>
                <Text style={s.tC}>{t('task.status' + n.status.charAt(0).toUpperCase() + n.status.slice(1))}</Text>
                <TouchableOpacity style={s.tDelBtn} onPress={() => confirmDelete(n)}>
                  <Text style={s.tDelBtnT}>🗑</Text>
                </TouchableOpacity>
              </View>
            ))}
            {/* Non-critical tasks */}
            {nonCritTasks.map((n) => (
              <View key={n.id} style={s.tRow}>
                <Text style={[s.tC, s.tNameC]} numberOfLines={1}>{n.name}</Text>
                <Text style={s.tC}>{n.es}</Text>
                <Text style={s.tC}>{n.ef}</Text>
                <Text style={s.tC}>{n.ls}</Text>
                <Text style={s.tC}>{n.lf}</Text>
                <Text style={[s.tC, { color: '#f39c12' }]}>{n.float}</Text>
                <Text style={s.tC}>{n.duration}</Text>
                <Text style={s.tC}>{t('task.status' + n.status.charAt(0).toUpperCase() + n.status.slice(1))}</Text>
                <TouchableOpacity style={s.tDelBtn} onPress={() => confirmDelete(n)}>
                  <Text style={s.tDelBtnT}>🗑</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Float Visualization */}
      <View style={s.card}>
        <Text style={s.cardT}>{t('criticalPath.floatTime')} {t('criticalPath.description')}</Text>
        {nodes.map((n) => {
          const maxFloat = Math.max(1, ...nodes.map((x) => x.float));
          const floatPct = maxFloat > 0 ? (n.float / maxFloat) * 100 : 0;
          const durPct = maxFloat > 0 ? (Math.max(n.duration, 1) / (Math.max(n.duration, 1) + n.float)) * 100 : 100;
          return (
            <View key={n.id} style={s.fRow}>
              <Text style={s.fName} numberOfLines={1}>{n.name}</Text>
              <View style={s.fBarC}>
                {n.float > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[s.fDur, { width: durPct + '%', maxWidth: '90%' }]} />
                    <View style={[s.fFloat, { flex: 1 }]}>
                      <Text style={s.fFloatT}>{n.float}{t('project.duration').split(' ')[0][0]}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[s.fDur, { width: '100%' }]} />
                )}
              </View>
              <View style={[s.fBadge, { backgroundColor: n.float === 0 ? '#e94560' : '#f39c12' }]}>
                <Text style={s.fBadgeT}>{n.float === 0 ? t('criticalPath.critical') : t('criticalPath.nonCritical')}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#1a1a2e' },
  cc: { padding: 16 },
  card: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardT: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 10 },
  desc: { color: '#a0a0b0', fontSize: 13, lineHeight: 20, marginBottom: 10 },
  stat: { color: '#a0a0b0', fontSize: 13, marginTop: 4 },
  hl: { color: '#e94560', fontWeight: '600' },
  node: { backgroundColor: '#0f3460', borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: '#e94560' },
  firstNode: {},
  nodeH: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  nodeN: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  nodeDelBtn: { width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(233,69,96,0.2)', justifyContent: 'center', alignItems: 'center' },
  nodeDelBtnT: { fontSize: 14 },
  critBadge: { backgroundColor: '#e94560', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  critBT: { color: '#fff', fontSize: 10, fontWeight: '600' },
  nodeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  nodeL: { color: '#a0a0b0', fontSize: 12 },
  nodeDur: { color: '#e94560', fontSize: 13, fontWeight: '600' },
  arrowR: { alignItems: 'center', paddingVertical: 4 },
  arrow: { width: 2, height: 8, backgroundColor: '#e94560' },
  arrowT: { color: '#e94560', fontSize: 16, lineHeight: 18, marginVertical: -2 },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#0f3460', paddingVertical: 6 },
  tH: { borderBottomColor: '#e94560' },
  critRow: { backgroundColor: 'rgba(233,69,96,0.1)' },
  tC: { color: '#a0a0b0', fontSize: 11, width: 50, textAlign: 'center' },
  tNameC: { width: 80, textAlign: 'left', color: '#fff' },
  tDelBtn: { width: 36, justifyContent: 'center', alignItems: 'center' },
  tDelBtnT: { fontSize: 14 },
  fRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  fName: { color: '#fff', fontSize: 12, width: 80, marginRight: 6 },
  fBarC: { flex: 1, height: 18, flexDirection: 'row', alignItems: 'center' },
  fDur: { height: 14, backgroundColor: '#3498db', borderRadius: 3 },
  fFloat: { height: 14, borderWidth: 1, borderColor: '#f39c12', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginLeft: 2, borderRadius: 3 },
  fFloatT: { color: '#f39c12', fontSize: 8 },
  fBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  fBadgeT: { color: '#fff', fontSize: 9, fontWeight: '600' },
});
