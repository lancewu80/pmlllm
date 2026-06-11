import React, { useState, useContext, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import useStore from '../store/useStore';
import { I18nContext } from '../i18n';

const STATUSES = ['planned', 'inProgress', 'completed', 'onHold'];

function ProjectForm({ visible, onClose, edit }) {
  const { t } = useContext(I18nContext);
  const createProject = useStore(s => s.createProject);
  const updateProject = useStore(s => s.updateProject);
  const isNew = !edit;
  const [name, setName] = useState(edit?.name || '');
  const [sd, setSd] = useState(edit?.startDate || '');
  const [ed, setEd] = useState(edit?.endDate || '');
  const [st, setSt] = useState(edit?.status || 'planned');

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    if (isNew) {
      createProject(name.trim(), sd || today, ed || '');
    } else {
      updateProject(edit.id, { name: name.trim(), startDate: sd, endDate: ed, status: st });
    }
    setName(''); setSd(''); setEd(''); setSt('planned');
    onClose();
  }, [name, sd, ed, st, isNew, edit, createProject, updateProject, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <ScrollView style={m.mc} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={m.mo}>
          <Text style={m.mt}>{isNew ? t('project.newProject') : t('project.editProject')}</Text>
          <Text style={m.l}>{t('project.name')} *</Text>
          <TextInput style={m.i} value={name} onChangeText={setName} placeholder={t('project.name')} placeholderTextColor="#555" />
          <Text style={m.l}>{t('project.startDate')}</Text>
          <TextInput style={m.i} value={sd} onChangeText={setSd} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />
          <Text style={m.l}>{t('project.endDate')}</Text>
          <TextInput style={m.i} value={ed} onChangeText={setEd} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />
          {!isNew && (
            <>
              <Text style={m.l}>{t('common.status')}</Text>
              <View style={m.rr}>{STATUSES.map(x => {
                const active = st === x;
                return (
                  <TouchableOpacity key={x} style={[m.rc, active && m.rca]} onPress={() => setSt(x)}>
                    <Text style={[m.rct, active && m.rcta]}>{t('project.status' + x.charAt(0).toUpperCase() + x.slice(1))}</Text>
                  </TouchableOpacity>
                );
              })}</View>
            </>
          )}
          <View style={m.br}>
            <TouchableOpacity style={[m.btn, m.cb]} onPress={onClose}><Text style={m.bt}>{t('common.cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={[m.btn, m.sb]} onPress={handleSave}><Text style={m.bt}>{t('common.save')}</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}

export default function ProjectScreen() {
  const { t } = useContext(I18nContext);
  const projects = useStore(s => s.projects);
  const currentId = useStore(s => s.currentProjectId);
  const pendingId = useStore(s => s.pendingProjectId);
  const selectProject = useStore(s => s.selectProject);
  const confirmProjectSwitch = useStore(s => s.confirmProjectSwitch);
  const cancelProjectSwitch = useStore(s => s.cancelProjectSwitch);
  const deleteProject = useStore(s => s.deleteProject);
  const [mv, setMv] = useState(false);
  const [editP, setEditP] = useState(null);

  const projList = Object.values(projects).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const handleEdit = useCallback((p) => { setEditP(p); setMv(true); }, []);
  const handleAdd = useCallback(() => { setEditP(null); setMv(true); }, []);
  const handleClose = useCallback(() => { setMv(false); setEditP(null); }, []);

  // A project is "selected" if it's the pending one (blue highlight) or the current active one (red border)
  const isSelected = (id) => id === pendingId || id === currentId;

  return (
    <View style={s.c}>
      <FlatList
        data={projList}
        keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const active = item.id === currentId;
          const pending = item.id === pendingId && item.id !== currentId;
          const statusColors = { planned: '#555', inProgress: '#2471a3', completed: '#1e8449', onHold: '#b7770d' };
          const statKey = 'project.status' + item.status.charAt(0).toUpperCase() + item.status.slice(1);
          return (
            <TouchableOpacity
              style={[s.pc, active && s.pcActive, pending && s.pcPending]}
              onPress={() => !active && selectProject(item.id)}
              activeOpacity={active ? 1 : 0.7}
            >
              {/* Header row */}
              <View style={s.pcH}>
                <Text style={[s.pn, active && { color: '#e94560' }, pending && { color: '#f39c12' }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {active && <Text style={s.activeBadge}>✓ {t('project.currentProject')}</Text>}
              </View>

              {/* Date + status */}
              <View style={s.pm}>
                <Text style={s.pd}>{item.startDate || '?'} → {item.endDate || '?'}</Text>
                <View style={[s.statusBadge, { backgroundColor: statusColors[item.status] || '#555' }]}>
                  <Text style={s.statusBadgeT}>{t(statKey)}</Text>
                </View>
              </View>

              {/* Pending: inline confirm section */}
              {pending && (
                <View style={s.pendingBox}>
                  <Text style={s.pendingHint}>⚡ 切換到此專案？</Text>
                  <View style={s.pendingBtns}>
                    <TouchableOpacity style={s.cancelInline} onPress={cancelProjectSwitch}>
                      <Text style={s.cancelInlineT}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.confirmInline} onPress={confirmProjectSwitch}>
                      <Text style={s.confirmInlineT}>✓ {t('common.confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Edit / Delete (only when not pending) */}
              {!pending && (
                <View style={s.pa}>
                  <TouchableOpacity style={s.ab} onPress={() => handleEdit(item)}>
                    <Text style={s.at}>{t('common.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.ab, s.db]}
                    onPress={() => Alert.alert('', t('project.deleteConfirm'), [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('common.delete'), style: 'destructive', onPress: () => deleteProject(item.id) },
                    ])}>
                    <Text style={[s.at, { color: '#e74c3c' }]}>{t('common.delete')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={s.lc}
        ListHeaderComponent={
          <TouchableOpacity style={s.abtn} onPress={handleAdd}>
            <Text style={s.abt}>+ {t('project.newProject')}</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={<Text style={s.em}>{t('common.noData')}</Text>}
        extraData={`${currentId}|${pendingId}`}
      />
      <ProjectForm visible={mv} onClose={handleClose} edit={editP} />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#1a1a2e' },
  lc: { padding: 16, paddingBottom: 100 },
  em: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 16 },
  abtn: { backgroundColor: '#e94560', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  abt: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Project card
  pc: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  pcActive: { borderColor: '#e94560' },
  pcPending: { borderColor: '#f39c12', backgroundColor: '#1c1a10' },
  pcH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pn: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  activeBadge: { color: '#e94560', fontSize: 10, backgroundColor: 'rgba(233,69,96,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  pm: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pd: { color: '#a0a0b0', fontSize: 12, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadgeT: { color: '#fff', fontSize: 11 },
  pa: { flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'flex-end' },
  ab: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 4, backgroundColor: '#0f3460' },
  db: { backgroundColor: 'rgba(231,76,60,0.15)' },
  at: { color: '#4fc3f7', fontSize: 12 },

  // Inline confirm (shown on pending card)
  pendingBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f39c12', paddingTop: 10 },
  pendingHint: { color: '#f39c12', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  pendingBtns: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelInline: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#0f3460' },
  cancelInlineT: { color: '#a0a0b0', fontSize: 13 },
  confirmInline: { paddingVertical: 8, paddingHorizontal: 22, borderRadius: 8, backgroundColor: '#f39c12' },
  confirmInlineT: { color: '#000', fontSize: 13, fontWeight: 'bold' },
});

const m = StyleSheet.create({
  mc: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  mo: { backgroundColor: '#16213e', margin: 20, borderRadius: 16, padding: 24 },
  mt: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  l: { color: '#a0a0b0', fontSize: 13, marginTop: 12, marginBottom: 4 },
  i: { backgroundColor: '#0f3460', color: '#fff', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 4 },
  rr: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  rc: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#0f3460' },
  rca: { backgroundColor: '#e94560' },
  rct: { color: '#a0a0b0', fontSize: 13 }, rcta: { color: '#fff' },
  br: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  cb: { backgroundColor: '#0f3460' }, sb: { backgroundColor: '#e94560' },
  bt: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
