import React, { useContext, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, TextInput,
  Alert, StyleSheet,
} from 'react-native';
import { I18nContext } from '../i18n';
import useStore from '../store/useStore';

const ROLES = ['admin', 'manager', 'member', 'viewer'];
const ROLE_COLORS = { admin: '#e94560', manager: '#f39c12', member: '#3498db', viewer: '#95a5a6' };

function emptyUser() {
  return { name: '', email: '', role: 'member' };
}

export default function UserScreen() {
  const { t } = useContext(I18nContext);
  const projectId = useStore(s => s.currentProjectId);
  const users = useStore(s => s.users);
  const tasks = useStore(s => s.currentTasks);
  const addUser = useStore(s => s.addUser);
  const updateUser = useStore(s => s.updateUser);
  const deleteUser = useStore(s => s.deleteUser);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [f, setF] = useState(emptyUser());

  function taskCount(id) {
    return tasks.filter((x) => x.assignee === id).length;
  }

  function openAdd() {
    setEditId(null);
    setF(emptyUser());
    setModal(true);
  }

  function openEdit(u) {
    setEditId(u.id);
    setF({ name: u.name, email: u.email, role: u.role });
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
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteUser(id) },
    ]);
  }

  function renderItem({ item: u }) {
    const cnt = taskCount(u.id);
    return (
      <TouchableOpacity style={s.card} onPress={() => openEdit(u)} onLongPress={() => confirmDelete(u.id)}>
        <View style={s.row}>
          <View style={[s.av, { backgroundColor: ROLE_COLORS[u.role] || '#95a5a6' }]}>
            <Text style={s.avT}>{u.name[0]}</Text>
          </View>
          <View style={s.info}>
            <Text style={s.n}>{u.name}</Text>
            <Text style={s.e}>{u.email}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: ROLE_COLORS[u.role] || '#95a5a6' }]}>
            <Text style={s.bT}>{t('user.roles.' + u.role)}</Text>
          </View>
        </View>
        <Text style={s.tc}>{t('task.title')}: {cnt}</Text>
      </TouchableOpacity>
    );
  }

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

      <Modal visible={modal} animationType="slide" transparent>
        <View style={s.mc}>
          <Text style={s.mh}>{editId ? t('common.edit') : t('common.add')} {t('user.title')}</Text>

          <Text style={s.lbl}>{t('user.name')}</Text>
          <TextInput style={s.inp} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} placeholderTextColor="#666" />

          <Text style={s.lbl}>{t('user.email')}</Text>
          <TextInput style={s.inp} value={f.email} onChangeText={(v) => setF({ ...f, email: v })} placeholderTextColor="#666" autoCapitalize="none" keyboardType="email-address" />

          <Text style={s.lbl}>{t('user.role')}</Text>
          <View style={s.chipR}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.chip, f.role === r && { backgroundColor: ROLE_COLORS[r] }]}
                onPress={() => setF({ ...f, role: r })}
              >
                <Text style={[s.chipT, f.role === r && { color: '#fff' }]}>{t('user.roles.' + r)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.btnR}>
            <TouchableOpacity style={[s.btn, s.btnC]} onPress={() => setModal(false)}><Text style={s.btnCT}>{t('common.cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnS]} onPress={save}><Text style={s.btnST}>{t('common.save')}</Text></TouchableOpacity>
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
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#e94560', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabT: { color: '#fff', fontSize: 28, lineHeight: 30 },
  mc: { backgroundColor: '#1a1a2e', marginTop: 120, marginHorizontal: 20, borderRadius: 16, padding: 20 },
  mh: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  lbl: { color: '#a0a0b0', fontSize: 13, marginBottom: 4, marginTop: 10 },
  inp: { backgroundColor: '#16213e', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#0f3460' },
  chipR: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#16213e', marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: '#0f3460' },
  chipT: { color: '#a0a0b0', fontSize: 12 },
  btnR: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 10 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnC: { backgroundColor: '#0f3460' },
  btnCT: { color: '#a0a0b0', fontSize: 14 },
  btnS: { backgroundColor: '#e94560' },
  btnST: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
