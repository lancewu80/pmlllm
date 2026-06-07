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
      {/* Confirm bar — visible when a pending project is selected */}
      {pendingId && pendingId !== currentId && (
        <View style={s.confirmBar}>
          <Text style={s.confirmText}>
            {t('project.switchProject')}: {projects[pendingId]?.name || ''}
          </Text>
          <View style={s.confirmBtns}>
            <TouchableOpacity style={s.confirmCancel} onPress={cancelProjectSwitch}>
              <Text style={s.confirmCancelT}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmOk} onPress={confirmProjectSwitch}>
              <Text style={s.confirmOkT}>✓ {t('common.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={projList}
        keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const active = item.id === currentId;
          const pending = item.id === pendingId && item.id !== currentId;
          const statusColors = { planned: '#666', inProgress: '#3498db', completed: '#27ae60', onHold: '#f39c12' };
          const statKey = 'project.status' + item.status.charAt(0).toUpperCase() + item.status.slice(1);
          return (
            <TouchableOpacity
              style={[
                s.pc,
                active && s.pcActive,
                pending && s.pcPending,
              ]}
              onPress={() => selectProject(item.id)}
              activeOpacity={0.7}
            >
              <View style={s.pcH}>
                <Text style={[s.pn, (active || pending) && { color: pending ? '#3498db' : '#e94560' }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {active && !pending && <Text style={s.activeBadge}>{t('project.currentProject')}</Text>}
                {pending && <Text style={s.pendingBadge}>{t('common.select')}</Text>}
              </View>
              <View style={s.pm}>
                <Text style={s.pd}>{item.startDate || '?'} → {item.endDate || '?'}</Text>
                <Text style={[s.ps, { backgroundColor: statusColors[item.status] || '#666' }]}>{t(statKey)}</Text>
              </View>
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

  // Confirm bar
  confirmBar: {
    backgroundColor: '#0f3460',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e94560',
  },
  confirmText: { color: '#fff', fontSize: 13, flex: 1, marginRight: 8 },
  confirmBtns: { flexDirection: 'row', gap: 8 },
  confirmCancel: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#1a1a2e' },
  confirmCancelT: { color: '#a0a0b0', fontSize: 12 },
  confirmOk: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#e94560' },
  confirmOkT: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // Project card
  pc: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  pcActive: { borderColor: '#e94560' },
  pcPending: { borderColor: '#3498db' },
  pcH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pn: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  activeBadge: { color: '#e94560', fontSize: 10, backgroundColor: 'rgba(233,69,96,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  pendingBadge: { color: '#3498db', fontSize: 10, backgroundColor: 'rgba(52,152,219,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  pm: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pd: { color: '#a0a0b0', fontSize: 12, flex: 1 },
  ps: { color: '#fff', fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  pa: { flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'flex-end' },
  ab: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 4, backgroundColor: '#0f3460' },
  db: { backgroundColor: 'rgba(231,76,60,0.15)' },
  at: { color: '#4fc3f7', fontSize: 12 },
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
