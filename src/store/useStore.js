import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sampleTasks, sampleUsers, sampleProject } from '../data/sampleData';

let _idCounter = Date.now();
function genId(pfx) { _idCounter++; return pfx + _idCounter; }

function save(key, val) { AsyncStorage.setItem('pmllm-' + key, JSON.stringify(val)).catch(() => {}); }
async function loadRaw(key) {
  try { const v = await AsyncStorage.getItem('pmllm-' + key); return v ? JSON.parse(v) : null; } catch { return null; }
}

async function loadAllData() {
  const [projects, currentProjectId, tasksByProject, users, lang] = await Promise.all([
    loadRaw('projects'), loadRaw('currentProjectId'), loadRaw('tasksByProject'), loadRaw('users'), loadRaw('lang'),
  ]);
  return { projects, currentProjectId, tasksByProject, users, lang };
}

const useStore = create((set, get) => ({
  // ---- state ----
  projects: { p1: { ...sampleProject } },
  currentProjectId: 'p1',
  pendingProjectId: null,           // ← NEW: user taps a project, this gets set
  tasksByProject: { p1: [...sampleTasks] },
  users: [...sampleUsers],          // ← CHANGED: single shared users list
  lang: 'zh',
  loaded: false,

  // ---- hydrate ----
  async hydrate() {
    const d = await loadAllData();
    if (!d) { set({ loaded: true }); return; }
    const s = {};
    if (d.projects) s.projects = d.projects;
    if (d.currentProjectId && d.projects?.[d.currentProjectId]) s.currentProjectId = d.currentProjectId;
    if (d.tasksByProject) s.tasksByProject = d.tasksByProject;
    if (d.users) s.users = d.users;
    if (d.lang) s.lang = d.lang;
    s.loaded = true;
    set(s);
  },

  // ---- computed getters ----
  get currentProject() { return get().projects[get().currentProjectId]; },
  get currentTasks() { return get().tasksByProject[get().currentProjectId] || []; },

  // ---- language ----
  setLang: (l) => { set({ lang: l }); save('lang', l); },
  toggleLang: () => {
    const l = get().lang === 'zh' ? 'en' : 'zh';
    set({ lang: l }); save('lang', l);
  },

  // ---- project management ----
  createProject: (name, startDate, endDate) => {
    const id = genId('p');
    const project = { id, name, startDate, endDate, status: 'planned' };
    set({
      projects: { ...get().projects, [id]: project },
      tasksByProject: { ...get().tasksByProject, [id]: [] },
      currentProjectId: id,
      pendingProjectId: null,
    });
    save('projects', get().projects);
    save('tasksByProject', get().tasksByProject);
    save('currentProjectId', id);
    return id;
  },

  // ---- NEW: select a project (pending, doesn't switch yet) ----
  selectProject: (id) => {
    set({ pendingProjectId: id });
  },

  // ---- NEW: confirm the pending project switch ----
  confirmProjectSwitch: () => {
    const pid = get().pendingProjectId;
    if (pid && get().projects[pid]) {
      set({ currentProjectId: pid, pendingProjectId: null });
      save('currentProjectId', pid);
    }
  },

  // ---- NEW: cancel pending switch ----
  cancelProjectSwitch: () => {
    set({ pendingProjectId: null });
  },

  updateProject: (id, updates) => {
    const project = { ...get().projects[id], ...updates };
    set({ projects: { ...get().projects, [id]: project } });
    save('projects', get().projects);
  },

  deleteProject: (id) => {
    const projects = { ...get().projects };
    delete projects[id];
    const tasksByProject = { ...get().tasksByProject };
    delete tasksByProject[id];
    const ids = Object.keys(projects);
    const cid = ids.length > 0 ? ids[0] : null;
    set({ projects, tasksByProject, currentProjectId: cid, pendingProjectId: null });
    save('projects', projects);
    save('tasksByProject', tasksByProject);
    save('currentProjectId', cid);
  },

  // ---- shared user CRUD ----
  addUser: (u) => {
    const id = genId('u');
    const user = { ...u, id };
    set({ users: [...get().users, user] });
    save('users', get().users);
    return id;
  },
  updateUser: (id, updates) => {
    set({ users: get().users.map(u => u.id === id ? { ...u, ...updates } : u) });
    save('users', get().users);
  },
  deleteUser: (id) => {
    const users = get().users.filter(u => u.id !== id);
    // Unassign tasks across ALL projects
    const tasksByProject = {};
    for (const [pid, tasks] of Object.entries(get().tasksByProject)) {
      tasksByProject[pid] = tasks.map(t => t.assigneeId === id ? { ...t, assigneeId: null } : t);
    }
    set({ users, tasksByProject });
    save('users', users);
    save('tasksByProject', tasksByProject);
  },

  // ---- task CRUD (per-project) ----
  _getTasksForPid(pid) { return get().tasksByProject[pid] || []; },

  addTask: (t) => {
    const pid = get().currentProjectId;
    if (!pid) return;
    const id = genId('t');
    const task = { ...t, id, progress: t.progress ?? 0, status: t.status ?? 'notStarted', isMilestone: t.isMilestone ?? false, predecessors: t.predecessors ?? [] };
    set({
      tasksByProject: { ...get().tasksByProject, [pid]: [...(get().tasksByProject[pid] || []), task] },
    });
    save('tasksByProject', get().tasksByProject);
    return id;
  },
  updateTask: (id, updates) => {
    const pid = get().currentProjectId;
    if (!pid) return;
    set({
      tasksByProject: { ...get().tasksByProject, [pid]: (get().tasksByProject[pid] || []).map(t => t.id === id ? { ...t, ...updates } : t) },
    });
    save('tasksByProject', get().tasksByProject);
  },
  deleteTask: (id) => {
    const pid = get().currentProjectId;
    if (!pid) return;
    set({
      tasksByProject: {
        ...get().tasksByProject,
        [pid]: (get().tasksByProject[pid] || [])
          .filter(t => t.id !== id)
          .map(t => ({ ...t, predecessors: (t.predecessors || []).filter(p => p !== id) })),
      },
    });
    save('tasksByProject', get().tasksByProject);
  },

  // ---- reset ----
  resetToSample: () => {
    set({
      projects: { p1: { ...sampleProject } },
      tasksByProject: { p1: [...sampleTasks] },
      users: [...sampleUsers],
      currentProjectId: 'p1',
      pendingProjectId: null,
    });
    save('projects', get().projects);
    save('tasksByProject', get().tasksByProject);
    save('users', sampleUsers);
    save('currentProjectId', 'p1');
  },
}));

export default useStore;
