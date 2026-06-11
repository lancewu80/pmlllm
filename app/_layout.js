import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { I18nProvider, useI18n } from '../src/i18n';
import useStore from '../src/store/useStore';

function CustomDrawerContent({ navigation }) {
  const { t, toggleLang } = useI18n();
  const projects = useStore(s => s.projects);
  const currentId = useStore(s => s.currentProjectId);
  const curProj = projects?.[currentId];

  const items = [
    { name: 'projects', label: t('sidebar.projects'), icon: '📁' },
    { name: 'index', label: t('sidebar.dashboard'), icon: '📊' },
    { name: 'tasks', label: t('sidebar.tasks'), icon: '📋' },
    { name: 'users', label: t('sidebar.users'), icon: '👥' },
    { name: 'gantt', label: t('sidebar.gantt'), icon: '📈' },
    { name: 'pert', label: t('sidebar.pert'), icon: '🔗' },
    { name: 'criticalpath', label: t('sidebar.criticalPath'), icon: '⚡' },
    { name: 'import', label: t('sidebar.import'), icon: '📥' },
    { name: 'export', label: t('sidebar.export'), icon: '📤' },
  ];

  return (
    <SafeAreaView style={dr.s}>
      <View style={dr.h}>
        <Text style={dr.hT}>{t('appName')}</Text>
        {curProj && <Text style={dr.subT} numberOfLines={1}>{curProj.name}</Text>}
      </View>
      <View style={dr.nav}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.name}
            style={dr.item}
            onPress={() => navigation.navigate(item.name)}
          >
            <Text style={dr.icon}>{item.icon}</Text>
            <Text style={dr.lbl}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={dr.lang} onPress={toggleLang}>
        <Text style={dr.langT}>{t('common.langSwitch')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        drawerStyle: { backgroundColor: '#16213e', width: 260 },
        drawerActiveTintColor: '#e94560',
        drawerInactiveTintColor: '#a0a0b0',
        drawerLabelStyle: { color: '#fff' },
      }}
    >
      <Drawer.Screen name="projects" options={{ title: 'Projects' }} />
      <Drawer.Screen name="index" options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Drawer.Screen name="users" options={{ title: 'Users' }} />
      <Drawer.Screen name="gantt" options={{ title: 'Gantt' }} />
      <Drawer.Screen name="pert" options={{ title: 'PERT' }} />
      <Drawer.Screen name="criticalpath" options={{ title: 'Critical Path' }} />
      <Drawer.Screen name="import" options={{ title: '匯入 xlsx' }} />
      <Drawer.Screen name="export" options={{ title: '匯出專案' }} />
    </Drawer>
  );
}

function HydrateOnMount() {
  const hydrate = useStore(s => s.hydrate);
  useEffect(() => { hydrate(); }, []);
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HydrateOnMount />
      <I18nProvider>
        <DrawerLayout />
      </I18nProvider>
    </GestureHandlerRootView>
  );
}

const dr = StyleSheet.create({
  s: { flex: 1, backgroundColor: '#16213e' },
  h: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  hT: { color: '#e94560', fontSize: 20, fontWeight: 'bold' },
  subT: { color: '#a0a0b0', fontSize: 12, marginTop: 4 },
  nav: { flex: 1, paddingTop: 10 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  icon: { fontSize: 18, marginRight: 14 },
  lbl: { color: '#fff', fontSize: 15 },
  lang: { padding: 20, borderTopWidth: 1, borderTopColor: '#0f3460', alignItems: 'center' },
  langT: { color: '#e94560', fontSize: 14, fontWeight: '600' },
});
