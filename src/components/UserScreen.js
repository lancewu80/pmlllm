import React, { useContext, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  Alert, StyleSheet, ScrollView, Dimensions,
} from 'react-native';

const SCREEN_H = Dimensions.get('window').height;
import { I18nContext } from '../i18n';
import useStore from '../store/useStore';

const ROLES = ['admin', 'manager', 'member', 'viewer'];
const ROLE_COLORS = { admin: '#e94560', manager: '#f39c12', member: '#3498db', viewer: '#95a5a6' };

const STATUS_COLORS = {
  completed: '#2ecc71',
  inProgress: '#3498db',
  notStarted: '#95a5a6',
  overdue: '#e74c3c',
};

function emptyUser() {
  return { name: '', email: '', role: 'member' };
}

function getStatusColor(task) {
  if (task.status === 'completed') return STATUS_COLORS.completed;
  if (task.status === 'inProgress') return STATUS_COLORS.inProgress;
  const now = new Date();
  if (task.endDate && new Date(task.endDate) < now) return STATUS_COLORS.overdue;
  return STATUS_COLORS.notStarted;
}

export default function UserScreen() {
  const { t } = useContext(I18nContext);
  const users = useStore(s => s.users);
  const tasksByProject = useStore(s => s.tasksByProject);
  const projects = useStore(s => s.projects);
  const addUser = useStore(s => s.addUser);
  const updateUser = useStore(s => s.updateUser);
  const deleteUser = useStore(s => s.deleteUser);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [f, setF] = useState(emptyUser());
  const [taskSortDesc, setTaskSortDesc] = useState(true); // true = newest first (default)

  // Gather all tasks for the user being edited, across all projects
  const userTasks = useMemo(() => {
    if (!editId) return [];
    const result = [];
    for (const [pid, tasks] of Object.entries(tasksByProject || {})) {
      const proj = projects[pid];
      for (const task of (tasks || [])) {
        if (task.assignee === editId) {
          result.push({ ...task, projectName: proj?.name || pid });
        }
      }
    }
    const dir = taskSortDesc ? -1 : 1;
    result.sort((a, b) =>
      (a.startDate || '').localeCompare(b.startDate || '') * dir
    );
    return result;
  }, [editId, tasksByProject, projects, taskSortDesc]);

  // Task count per user across ALL projects
  function taskCount(uid) {
    let cnt = 0;
    for (const tasks of Object.values(tasksByProject || {})) {
      cnt += (tasks || []).filter(x => x.assignee === uid).length;
    }
    return cnt;
  }

  function openAdd() {
    setEditId(null);
    setF(emptyUser());
    setModal(true);
  }

  function openEdit(u) {
    setEditId(u.id);
    setF({ name: u.name || '', email: u.email || '', role: u.role || 'member' });
    setModal(true);
  }

  function save() {
    if (!f.name || !f.email) {
      Alert.alert(t('common.required'), t('common.required'));
      return;
    }
    if (editId) {
      updateUser(editId, f);
    } else {
      addUser(f);
    }
    setModal(false);
  }

  function confirmDelete(id) {
    Alert.alert(t('common.confirm'), t('user.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => { deleteUser(id); setModal(false); } },
    ]);
  }

  function renderItem({ item: u }) {
    const cnt = taskCount(u.id);
    return (
      <TouchableOpacity style={s.card} onPress={() => openEdit(u)} onLongPress={() => confirmDelete(u.id)}>
        <View style={s.row}>
          <View style={[s.av, { backgroundColor: ROLE_COLORS[u.role] || '#95a5a6' }]}>
            <Text style={s.avT}>{(u.name || '?')[0]}</Text>
          </View>
          <View style={s.info}>
            <Text style={s.n}>{u.name}</Text>
            <Text style={s.e}>{u.email}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: ROLE_COLORS[u.role] || '#95a5a6' }]}>
            <Text style={s.bT}>{t('user.roles.' + u.role)}</Text>
          </View>
        </View>
        <Text style={s.tc}>📋 {cnt} {t('task.title')}</Text>
      </TouchableOpacity>
    );
  }

  const statusLabel = (task) => {
    if (task.status === 'completed') return '✅ 已完成';
    if (task.status === 'inProgress') return '🔄 進行中';
    const now = new Date();
    if (task.endDate && new Date(task.endDate) < now) return '⚠️ 已逾期';
    return '⏳ 未開始';
  };

  return (
    <View style={s.c}>
      <FlatList
        data={users}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        contentContainerStyle={s.lc}
        ListEmptyComponent={<Text style={s.empty}>{t('common.noData')}</Text>}
      />
      <TouchableOpacity style={s.fab} onPress={openAdd}><Text style={s.fabT}>+</Text></TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        {/* Outer flex column: top = tappable backdrop, bottom = sheet */}
        <View style={s.overlay}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setModal(false)} />
          <View style={s.sheet}>
          <ScrollView nestedScrollEnabled contentContainerStyle={s.mContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ── Profile Header (edit mode only) ── */}
            {editId && (
              <View style={s.profileHeader}>
                <View style={[s.avLarge, { backgroundColor: ROLE_COLORS[f.role] || '#95a5a6' }]}>
                  <Text style={s.avLargeT}>{(f.name || '?')[0]}</Text>
                </View>
                <View style={s.profileInfo}>
                  <Text style={s.profileName}>{f.name || '—'}</Text>
                  <Text style={s.profileEmail}>{f.email || '—'}</Text>
                  <View style={[s.profileBadge, { backgroundColor: ROLE_COLORS[f.role] || '#95a5a6' }]}>
                    <Text style={s.profileBadgeT}>{t('user.roles.' + f.role)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── Form title (add mode) ── */}
            {!editId && (
              <Text style={s.mh}>{t('common.add')} {t('user.title')}</Text>
            )}

            {/* ── Edit Form ── */}
            <View style={s.section}>
              <Text style={[s.sectionTitle, { marginBottom: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#0f3460' }]}>✏️ {editId ? t('common.edit') : t('common.add')}</Text>

              <Text style={s.lbl}>{t('user.name')}</Text>
              <TextInput
                style={s.inp}
                value={f.name}
                onChangeText={(v) => setF({ ...f, name: v })}
                placeholderTextColor="#666"
                placeholder={t('user.name')}
              />

              <Text style={s.lbl}>{t('user.email')}</Text>
              <TextInput
                style={s.inp}
                value={f.email}
                onChangeText={(v) => setF({ ...f, email: v })}
                placeholderTextColor="#666"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={t('user.email')}
              />

              <Text style={s.lbl}>{t('user.role')}</Text>
              <View style={s.chipR}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[s.chip, f.role === r && { backgroundColor: ROLE_COLORS[r], borderColor: ROLE_COLORS[r] }]}
                    onPress={() => setF({ ...f, role: r })}
                  >
                    <Text style={[s.chipT, f.role === r && { color: '#fff' }]}>{t('user.roles.' + r)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Assigned Tasks (edit mode only) ── */}
            {editId && (
              <View style={s.section}>
                <View style={s.sectionRow}>
                <Text style={s.sectionTitle}>📋 已指派的任務 ({userTasks.length})</Text>
                <TouchableOpacity style={s.sortBtn} onPress={() => setTaskSortDesc(v => !v)}>
                  <Text style={s.sortBtnT}>{taskSortDesc ? '↓ 最新' : '↑ 最舊'}</Text>
                </TouchableOpacity>
              </View>
                {userTasks.length === 0 ? (
                  <Text style={s.noTasks}>目前沒有指派任何任務</Text>
                ) : (
                  userTasks.map((task) => (
                    <View key={task.id} style={s.taskCard}>
                      <View style={s.taskHeader}>
                        <View style={[s.taskDot, { backgroundColor: getStatusColor(task) }]} />
                        <Text style={s.taskName} numberOfLines={1}>{task.name}</Text>
                      </View>
                      <View style={s.taskMeta}>
                        {/* Project badge */}
                        <View style={s.projBadge}>
                          <Text style={s.projBadgeT}>📁 {task.projectName}</Text>
                        </View>
                        {/* Status */}
                        <Text style={[s.taskStatus, { color: getStatusColor(task) }]}>
                          {statusLabel(task)}
                        </Text>
                      </View>
                      {/* Dates */}
                      <Text style={s.taskDate}>
                        {task.startDate} → {task.endDate}
                        {task.progress > 0 ? `　${task.progress}%` : ''}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── Buttons ── */}
            <View style={s.btnR}>
              {editId && (
                <TouchableOpacity style={[s.btn, s.btnD]} onPress={() => confirmDelete(editId)}>
                  <Text style={s.btnDT}>{t('common.delete')}</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={[s.btn, s.btnC]} onPress={() => setModal(false)}>
                <Text style={s.btnCT}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnS]} onPress={save}>
                <Text style={s.btnST}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#1a1a2e' },
  lc: { padding: 16, paddingBottom: 100 },
  empty: { color: '#a0a0b0', fontSize: 16, textAlign: 'center', marginTop: 60 },

  // ── User card ──
  card: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  av: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avT: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  info: { flex: 1 },
  n: { color: '#fff', fontSize: 15, fontWeight: '600' },
  e: { color: '#a0a0b0', fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bT: { color: '#fff', fontSize: 11, fontWeight: '600' },
  tc: { color: '#a0a0b0', fontSize: 12, marginTop: 6, marginLeft: 56 },

  // ── FAB ──
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabT: { color: '#fff', fontSize: 28, lineHeight: 30 },

  // ── Modal overlay ──
  // flex column: backdrop (flex:1 tappable area) on top, sheet fixed at bottom
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  backdrop: { flex: 1 },   // fills remaining space above the sheet; tap closes modal
  sheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_H * 0.88,  // explicit px — reliable on Android
  },
  mContent: { padding: 20, paddingBottom: 48 },
  mh: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },

  // ── Profile header ──
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  avLarge: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avLargeT: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  profileName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  profileEmail: { color: '#a0a0b0', fontSize: 13, marginTop: 2 },
  profileBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  profileBadgeT: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // ── Sections ──
  section: { marginBottom: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sortBtn: { backgroundColor: '#16213e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#0f3460' },
  sortBtnT: { color: '#a0a0b0', fontSize: 11 },

  // ── Form ──
  lbl: { color: '#a0a0b0', fontSize: 13, marginBottom: 4, marginTop: 10 },
  inp: { backgroundColor: '#16213e', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#0f3460' },
  chipR: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#16213e', marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: '#0f3460' },
  chipT: { color: '#a0a0b0', fontSize: 12 },

  // ── Task cards ──
  noTasks: { color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  taskCard: { backgroundColor: '#0f3460', borderRadius: 10, padding: 12, marginBottom: 8 },
  taskHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  taskDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  taskName: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  projBadge: { backgroundColor: '#1a1a2e', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  projBadgeT: { color: '#3498db', fontSize: 11 },
  taskStatus: { fontSize: 11, fontWeight: '600' },
  taskDate: { color: '#c0c0d0', fontSize: 11, marginTop: 2 },

  // ── Buttons ──
  btnR: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  btn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 8 },
  btnD: { backgroundColor: 'rgba(233,69,96,0.15)', borderWidth: 1, borderColor: '#e94560' },
  btnDT: { color: '#e94560', fontSize: 13, fontWeight: '600' },
  btnC: { backgroundColor: '#0f3460' },
  btnCT: { color: '#a0a0b0', fontSize: 14 },
  btnS: { backgroundColor: '#e94560' },
  btnST: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
