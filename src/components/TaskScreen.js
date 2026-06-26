import React, { useContext, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  Switch, ScrollView, Alert, StyleSheet, Platform,
} from 'react-native';
import { I18nContext } from '../i18n';
import useStore from '../store/useStore';
import ProjectSwitcher from './ProjectSwitcher';

const EMPTY_ARR = [];
const STATUSES = ['notStarted', 'inProgress', 'completed', 'blocked'];
const STATUS_COLORS = { notStarted: '#95a5a6', inProgress: '#3498db', completed: '#2ecc71', blocked: '#e74c3c' };

function emptyTask(projectId) {
  return {
    projectId: projectId || '',
    name: '', description: '', assignee: '', startDate: '', endDate: '',
    duration: '0', progress: '0', status: 'notStarted', isMilestone: false, predecessors: [],
  };
}

export default function TaskScreen() {
  const { t } = useContext(I18nContext);
  const projectId = useStore(s => s.currentProjectId);
  const projects = useStore(s => s.projects);
  const tasks = useStore(s => s.tasksByProject[s.currentProjectId] || EMPTY_ARR);
  const tasksByProject = useStore(s => s.tasksByProject);
  const users = useStore(s => s.users);
  const addTask = useStore(s => s.addTask);
  const updateTask = useStore(s => s.updateTask);
  const moveTask = useStore(s => s.moveTask);
  const deleteTask = useStore(s => s.deleteTask);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editOriginalPid, setEditOriginalPid] = useState(null);
  const [f, setF] = useState(emptyTask(projectId));
  const [sortDesc, setSortDesc] = useState(true); // true = newest first (default)

  const sorted = useMemo(() => {
    const dir = sortDesc ? -1 : 1;
    return [...tasks].sort((a, b) =>
      (a.startDate || '').localeCompare(b.startDate || '') * dir
    );
  }, [tasks, projectId, sortDesc]);

  // Project list for selector inside modal
  const projList = useMemo(
    () => Object.values(projects).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [projects]
  );

  function openAdd() {
    setEditId(null);
    setEditOriginalPid(null);
    setF(emptyTask(projectId));
    setModal(true);
  }

  function openEdit(tsk) {
    setEditId(tsk.id);
    setEditOriginalPid(tsk.projectId || projectId);
    setF({
      projectId: tsk.projectId || projectId,
      name: tsk.name,
      description: tsk.description || '',
      assignee: tsk.assignee || '',
      startDate: tsk.startDate,
      endDate: tsk.endDate,
      duration: String(tsk.duration),
      progress: String(tsk.progress),
      status: tsk.status,
      isMilestone: tsk.isMilestone,
      predecessors: [...(tsk.predecessors || [])],
    });
    setModal(true);
  }

  function save() {
    const payload = {
      name: f.name,
      description: f.description,
      assignee: f.assignee,
      startDate: f.startDate,
      endDate: f.endDate,
      duration: parseInt(f.duration, 10) || 0,
      progress: parseInt(f.progress, 10) || 0,
      status: f.status,
      isMilestone: f.isMilestone,
      predecessors: f.predecessors,
    };
    if (!payload.name || !payload.startDate || !payload.endDate) {
      Alert.alert(t('common.required'), t('task.requiredField'));
      return;
    }
    const targetPid = f.projectId || projectId;
    if (editId) {
      if (targetPid !== editOriginalPid) {
        // Project changed → move task
        moveTask(editId, editOriginalPid, targetPid, payload);
      } else {
        updateTask(editId, payload, editOriginalPid);
      }
      Alert.alert('', t('task.editSuccess'));
    } else {
      addTask(payload, targetPid);
      Alert.alert('', t('task.addSuccess'));
    }
    setModal(false);
  }

  function confirmDelete(id, pid) {
    if (Platform.OS === 'web') {
      if (window.confirm(t('task.deleteConfirm'))) {
        deleteTask(id, pid || projectId);
      }
    } else {
      Alert.alert(t('common.confirm'), t('task.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => deleteTask(id, pid || projectId) },
      ]);
    }
  }

  function togglePred(pId) {
    setF((prev) => ({
      ...prev,
      predecessors: prev.predecessors.includes(pId)
        ? prev.predecessors.filter((x) => x !== pId)
        : [...prev.predecessors, pId],
    }));
  }

  // Predecessor picker: tasks belonging to whichever project is selected in the form
  const selectedProjTasks = useMemo(
    () => (tasksByProject[f.projectId] || []).filter(x => x.id !== editId),
    [tasksByProject, f.projectId, editId]
  );

  function renderItem({ item: tsk }) {
    const u = users.find((x) => x.id === tsk.assignee);
    const projName = projects[tsk.projectId]?.name || projects[projectId]?.name || '';
    return (
      <View style={s.card}>
        <TouchableOpacity style={s.cardBody} onPress={() => openEdit(tsk)} activeOpacity={0.7}>
          {/* Project tag row */}
          <View style={s.projTag}>
            <Text style={s.projTagIcon}>📁</Text>
            <Text style={s.projTagT} numberOfLines={1}>{projName}</Text>
            {tsk.isMilestone && <Text style={s.mil}>◆ 里程碑</Text>}
          </View>
          <View style={s.ch}>
            <Text style={s.cN}>{tsk.name}</Text>
            <View style={[s.badge, { backgroundColor: STATUS_COLORS[tsk.status] || '#95a5a6' }]}>
              <Text style={s.bT}>{t('task.status' + tsk.status.charAt(0).toUpperCase() + tsk.status.slice(1))}</Text>
            </View>
          </View>
          {tsk.description ? <Text style={s.cD} numberOfLines={2}>{tsk.description}</Text> : null}
          <View style={s.cr}>
            <Text style={s.cL}>👤 {u ? u.name : '-'}</Text>
            <Text style={s.cL}>{tsk.startDate} ~ {tsk.endDate}</Text>
          </View>
          <View style={s.pb}><View style={[s.pf, { width: tsk.progress + '%' }]} /></View>
          <Text style={s.cP}>{tsk.progress}%</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.delBtn} onPress={() => confirmDelete(tsk.id, tsk.projectId)}>
          <Text style={s.delBtnT}>🗑</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.c}>
      <ProjectSwitcher />
      <View style={s.toolbar}>
        <Text style={s.toolbarLabel}>{sorted.length} 個任務</Text>
        <TouchableOpacity style={s.sortBtn} onPress={() => setSortDesc(v => !v)}>
          <Text style={s.sortBtnT}>{sortDesc ? '↓ 最新' : '↑ 最舊'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        key={projectId}
        data={sorted}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        contentContainerStyle={s.lc}
        ListEmptyComponent={<Text style={s.empty}>{t('common.noData')}</Text>}
        extraData={projectId}
      />
      <TouchableOpacity style={s.fab} onPress={openAdd}><Text style={s.fabT}>+</Text></TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent>
        <ScrollView style={s.mc} contentContainerStyle={s.mcc}>
          <Text style={s.mh}>{editId ? t('common.edit') : t('common.add')} {t('task.title')}</Text>

          {/* ── Project selector ── */}
          <Text style={s.lbl}>📁 指派到專案</Text>
          <ScrollView horizontal style={s.chipR} showsHorizontalScrollIndicator={false}>
            {projList.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[s.chip, f.projectId === p.id && s.chipProjA]}
                onPress={() => setF({ ...f, projectId: p.id, predecessors: [] })}
              >
                <Text style={[s.chipT, f.projectId === p.id && s.chipTA]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.lbl}>{t('task.name')}</Text>
          <TextInput style={s.inp} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} placeholderTextColor="#666" />

          <Text style={s.lbl}>{t('task.description')}</Text>
          <TextInput style={[s.inp, { height: 60 }]} value={f.description} onChangeText={(v) => setF({ ...f, description: v })} multiline placeholderTextColor="#666" />

          <Text style={s.lbl}>{t('task.assignee')}</Text>
          <ScrollView horizontal style={s.chipR} showsHorizontalScrollIndicator={false}>
            {users.map((u) => (
              <TouchableOpacity
                key={u.id}
                style={[s.chip, f.assignee === u.id && s.chipA]}
                onPress={() => setF({ ...f, assignee: f.assignee === u.id ? '' : u.id })}
              >
                <Text style={[s.chipT, f.assignee === u.id && s.chipTA]}>{u.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.row}>
            <View style={s.half}>
              <Text style={s.lbl}>{t('task.startDate')}</Text>
              <TextInput style={s.inp} value={f.startDate} onChangeText={(v) => setF({ ...f, startDate: v })} placeholder="YYYY-MM-DD" placeholderTextColor="#666" />
            </View>
            <View style={s.half}>
              <Text style={s.lbl}>{t('task.endDate')}</Text>
              <TextInput style={s.inp} value={f.endDate} onChangeText={(v) => setF({ ...f, endDate: v })} placeholder="YYYY-MM-DD" placeholderTextColor="#666" />
            </View>
          </View>

          <View style={s.row}>
            <View style={s.half}>
              <Text style={s.lbl}>{t('task.duration')}</Text>
              <TextInput style={s.inp} value={f.duration} onChangeText={(v) => setF({ ...f, duration: v })} keyboardType="numeric" placeholderTextColor="#666" />
            </View>
            <View style={s.half}>
              <Text style={s.lbl}>{t('task.progress')}</Text>
              <TextInput style={s.inp} value={f.progress} onChangeText={(v) => setF({ ...f, progress: v })} keyboardType="numeric" placeholderTextColor="#666" />
            </View>
          </View>

          <View style={s.swRow}>
            <Text style={s.lbl}>{t('task.isMilestone')}</Text>
            <Switch value={f.isMilestone} onValueChange={(v) => setF({ ...f, isMilestone: v })} trackColor={{ false: '#333', true: '#e94560' }} />
          </View>

          <Text style={s.lbl}>{t('task.status')}</Text>
          <ScrollView horizontal style={s.chipR} showsHorizontalScrollIndicator={false}>
            {STATUSES.map((st) => (
              <TouchableOpacity
                key={st}
                style={[s.chip, f.status === st && { backgroundColor: STATUS_COLORS[st] }]}
                onPress={() => setF({ ...f, status: st })}
              >
                <Text style={[s.chipT, f.status === st && { color: '#fff' }]}>{t('task.status' + st.charAt(0).toUpperCase() + st.slice(1))}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.lbl}>{t('task.predecessors')}</Text>
          {selectedProjTasks.length === 0 && <Text style={s.muted}>{t('task.noPredecessors')}</Text>}
          {selectedProjTasks.map((ot) => (
            <TouchableOpacity key={ot.id} style={s.pRow} onPress={() => togglePred(ot.id)}>
              <View style={[s.chk, f.predecessors.includes(ot.id) && s.chkA]}>
                {f.predecessors.includes(ot.id) && <Text style={s.chkX}>✓</Text>}
              </View>
              <Text style={s.pN}>{ot.name}</Text>
            </TouchableOpacity>
          ))}

          <View style={s.btnR}>
            <TouchableOpacity style={[s.btn, s.btnC]} onPress={() => setModal(false)}><Text style={s.btnCT}>{t('common.cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnS]} onPress={save}><Text style={s.btnST}>{t('common.save')}</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#1a1a2e' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  toolbarLabel: { color: '#a0a0b0', fontSize: 12 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#0f3460' },
  sortBtnT: { color: '#a0a0b0', fontSize: 12 },
  lc: { padding: 16, paddingBottom: 100 },
  empty: { color: '#a0a0b0', fontSize: 16, textAlign: 'center', marginTop: 60 },
  card: { backgroundColor: '#16213e', borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'stretch' },
  cardBody: { flex: 1, padding: 14 },
  delBtn: { width: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(233,69,96,0.12)', borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  delBtnT: { fontSize: 16 },
  projTag: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 },
  projTagIcon: { fontSize: 11, opacity: 0.7 },
  projTagT: { color: '#4fc3f7', fontSize: 11, fontWeight: '600', flex: 1 },
  ch: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cN: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
  mil: { color: '#f39c12', fontSize: 11, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  bT: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cD: { color: '#a0a0b0', fontSize: 12, marginTop: 4, marginBottom: 6 },
  cr: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cL: { color: '#a0a0b0', fontSize: 12 },
  pb: { height: 4, backgroundColor: '#0f3460', borderRadius: 2, overflow: 'hidden' },
  pf: { height: 4, backgroundColor: '#e94560', borderRadius: 2 },
  cP: { color: '#a0a0b0', fontSize: 11, marginTop: 2, textAlign: 'right' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabT: { color: '#fff', fontSize: 28, lineHeight: 30 },
  mc: { flex: 1, backgroundColor: '#1a1a2e', marginTop: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  mcc: { padding: 20, paddingBottom: 60 },
  mh: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  lbl: { color: '#a0a0b0', fontSize: 13, marginBottom: 4, marginTop: 10 },
  inp: { backgroundColor: '#16213e', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#0f3460' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  chipR: { flexDirection: 'row', marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#16213e', marginRight: 6, borderWidth: 1, borderColor: '#0f3460' },
  chipA: { backgroundColor: '#0f3460', borderColor: '#e94560' },
  chipProjA: { backgroundColor: '#1e3a1e', borderColor: '#2ecc71' },
  chipT: { color: '#a0a0b0', fontSize: 12 },
  chipTA: { color: '#fff' },
  swRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  pRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  chk: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#0f3460', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  chkA: { backgroundColor: '#e94560', borderColor: '#e94560' },
  chkX: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  pN: { color: '#fff', fontSize: 13 },
  muted: { color: '#a0a0b0', fontSize: 13, fontStyle: 'italic' },
  btnR: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 10 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnC: { backgroundColor: '#0f3460' },
  btnCT: { color: '#a0a0b0', fontSize: 14 },
  btnS: { backgroundColor: '#e94560' },
  btnST: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
