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
    if (d.projects && typeof d.projects === 'object') s.projects = d.projects;
    if (d.currentProjectId && d.projects?.[d.currentProjectId]) s.currentProjectId = d.currentProjectId;
    if (d.tasksByProject && typeof d.tasksByProject === 'object') {
      // Ensure all project arrays are actually arrays
      const tbp = {};
      for (const [k, v] of Object.entries(d.tasksByProject)) {
        tbp[k] = Array.isArray(v) ? v : [];
      }
      s.tasksByProject = tbp;
    }
    if (d.users && Array.isArray(d.users)) s.users = d.users;
    if (d.lang) s.lang = d.lang;
    s.loaded = true;
    set(s);
  },

  // NOTE: Do NOT use JS getters here — Zustand spread loses them after every set().
  // Use per-component selectors instead:
  //   tasks:   useStore(s => s.tasksByProject[s.currentProjectId] || [])
  //   project: useStore(s => s.projects[s.currentProjectId])

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

  // ---- select a project (pending, for ProjectScreen confirm flow) ----
  selectProject: (id) => {
    set({ pendingProjectId: id });
  },

  // ---- directly switch project (no confirm needed, used by TaskScreen) ----
  switchProject: (id) => {
    if (id && get().projects[id]) {
      set({ currentProjectId: id, pendingProjectId: null });
      save('currentProjectId', id);
    }
  },

  // ---- confirm the pending project switch ----
  confirmProjectSwitch: () => {
    const pid = get().pendingProjectId;
    if (pid && get().projects[pid]) {
      set({ currentProjectId: pid, pendingProjectId: null });
      save('currentProjectId', pid);
    }
  },

  // ---- cancel pending switch ----
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

  // Add a task. targetPid defaults to currentProjectId.
  addTask: (t, targetPid) => {
    const pid = targetPid || get().currentProjectId;
    if (!pid || !get().projects[pid]) return;
    const id = genId('t');
    const task = {
      ...t, id, projectId: pid,
      progress: t.progress ?? 0,
      status: t.status ?? 'notStarted',
      isMilestone: t.isMilestone ?? false,
      predecessors: t.predecessors ?? [],
    };
    set({ tasksByProject: { ...get().tasksByProject, [pid]: [...(get().tasksByProject[pid] || []), task] } });
    save('tasksByProject', get().tasksByProject);
    return id;
  },

  // Update a task in its current project (fromPid). If fromPid omitted, uses currentProjectId.
  updateTask: (id, updates, fromPid) => {
    const pid = fromPid || get().currentProjectId;
    if (!pid) return;
    set({
      tasksByProject: {
        ...get().tasksByProject,
        [pid]: (get().tasksByProject[pid] || []).map(t => t.id === id ? { ...t, ...updates } : t),
      },
    });
    save('tasksByProject', get().tasksByProject);
  },

  // Move a task from one project to another (and apply updates).
  // Clears predecessors since they're project-scoped.
  moveTask: (taskId, fromPid, toPid, updates) => {
    const tbp = { ...get().tasksByProject };
    const fromList = tbp[fromPid] || [];
    const task = fromList.find(t => t.id === taskId);
    if (!task) return;
    const updated = { ...task, ...updates, projectId: toPid, predecessors: [] };
    tbp[fromPid] = fromList
      .filter(t => t.id !== taskId)
      .map(t => ({ ...t, predecessors: (t.predecessors || []).filter(p => p !== taskId) }));
    tbp[toPid] = [...(tbp[toPid] || []), updated];
    set({ tasksByProject: tbp });
    save('tasksByProject', tbp);
  },

  deleteTask: (id, fromPid) => {
    const pid = fromPid || get().currentProjectId;
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

  // ---- bulk import (xlsx) ----
  // projects: { [id]: projectObj }
  // tasksByProject: { [projectId]: [taskObj, ...] }
  bulkImport: ({ projects, tasksByProject }) => {
    // Projects: spread-merge so re-importing same project_id updates it in place.
    const newProjects = { ...get().projects, ...projects };
    const newTbp = { ...get().tasksByProject };
    for (const [pid, incomingTasks] of Object.entries(tasksByProject)) {
      const existing = newTbp[pid] || [];

      // Build index of existing tasks by id AND by rawId (original xlsx task_id).
      // This handles legacy tasks that were imported before rawId was stored.
      const byId  = new Map(existing.map(t => [t.id,    t]));
      const byRaw = new Map(existing.filter(t => t.rawId).map(t => [t.rawId, t]));

      for (const t of incomingTasks) {
        // If an existing task shares the same rawId but a different internal id
        // (legacy timestamp id), remove the old entry first.
        if (t.rawId && byRaw.has(t.rawId)) {
          const old = byRaw.get(t.rawId);
          if (old.id !== t.id) byId.delete(old.id);
          byRaw.delete(t.rawId);
        }
        byId.set(t.id, t);
        if (t.rawId) byRaw.set(t.rawId, t);
      }

      newTbp[pid] = Array.from(byId.values());
    }
    // Switch to first imported project
    const firstPid = Object.keys(projects)[0];
    const newCurrent = firstPid || get().currentProjectId;
    set({ projects: newProjects, tasksByProject: newTbp, currentProjectId: newCurrent });
    save('projects', newProjects);
    save('tasksByProject', newTbp);
    save('currentProjectId', newCurrent);
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
