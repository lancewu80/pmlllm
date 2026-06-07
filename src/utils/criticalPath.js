/**
 * Critical Path Method (CPM) — forward/backward pass
 */

export function computeCriticalPath(tasks) {
  if (!tasks || tasks.length === 0) return { nodes: [], criticalIds: [], totalDuration: 0, baseDate: 0, numDays: 0 };

  const normal = tasks.filter(t => !t.isMilestone);
  const mils = tasks.filter(t => t.isMilestone);
  const sorted = [...normal].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  if (sorted.length === 0) {
    return { nodes: [], criticalIds: [], totalDuration: 0, baseDate: 0, numDays: 0 };
  }

  const baseDate = sorted[0].startDate;
  const baseMs = new Date(baseDate).getTime();

  const toDay = (d) => Math.round((new Date(d).getTime() - baseMs) / 86400000);
  const fromDay = (d) => {
    const dt = new Date(baseMs + d * 86400000);
    return dt.toISOString().slice(0, 10);
  };

  const nodeMap = {};
  for (const t of sorted) {
    const es = toDay(t.startDate);
    const ef = toDay(t.endDate);
    nodeMap[t.id] = {
      id: t.id,
      name: t.name || '',
      description: t.description || '',
      assignee: t.assignee || '',
      assigneeId: t.assigneeId || '',
      progress: t.progress ?? 0,
      status: t.status || 'notStarted',
      isMilestone: false,
      duration: Math.max(1, ef - es + 1),
      es, ef,
      ls: Infinity, lf: Infinity, float: Infinity,
      isCritical: false,
      startDate: t.startDate,
      endDate: t.endDate,
      predecessors: [...(t.predecessors || [])],
      successors: [],
    };
  }

  // Build successors
  for (const n of Object.values(nodeMap)) {
    for (const pid of n.predecessors) {
      if (nodeMap[pid]) nodeMap[pid].successors.push(n.id);
    }
  }

  // Topological sort
  const visited = {};
  const order = [];
  function dfs(id) {
    if (visited[id]) return;
    visited[id] = true;
    const n = nodeMap[id];
    if (!n) return;
    for (const sid of n.successors) dfs(sid);
    order.push(id);
  }
  for (const id of Object.keys(nodeMap)) dfs(id);
  const topo = order.reverse();

  // Forward pass
  for (const id of topo) {
    const n = nodeMap[id];
    if (n.predecessors.length === 0) {
      n.es = 0;
      n.ef = n.duration - 1;
    } else {
      let maxEF = 0;
      for (const pid of n.predecessors) {
        if (nodeMap[pid]) maxEF = Math.max(maxEF, nodeMap[pid].ef);
      }
      n.es = maxEF + 1;
      n.ef = n.es + n.duration - 1;
    }
  }

  // Project end
  let projectEnd = 0;
  for (const n of Object.values(nodeMap)) projectEnd = Math.max(projectEnd, n.ef);
  const numDays = projectEnd + 1;

  // Backward pass
  const rev = [...topo].reverse();
  for (const id of rev) {
    const n = nodeMap[id];
    if (n.successors.length === 0) {
      n.lf = projectEnd;
      n.ls = n.lf - n.duration + 1;
    } else {
      let minLS = Infinity;
      for (const sid of n.successors) {
        if (nodeMap[sid]) minLS = Math.min(minLS, nodeMap[sid].ls);
      }
      n.lf = minLS - 1;
      n.ls = n.lf - n.duration + 1;
    }
    n.float = n.ls - n.es;
    n.isCritical = n.float === 0;
  }

  const criticalIds = Object.values(nodeMap).filter(n => n.isCritical).map(n => n.id);

  // Add milestones
  for (const m of mils) {
    const d = toDay(m.endDate);
    nodeMap[m.id] = {
      id: m.id, name: m.name || '', description: m.description || '', isMilestone: true,
      assignee: m.assignee || '', assigneeId: m.assigneeId || '',
      progress: m.progress ?? 0, status: m.status || 'notStarted',
      duration: 0, es: d, ef: d, ls: d, lf: d, float: 0, isCritical: false,
      startDate: m.startDate, endDate: m.endDate,
      predecessors: [...(m.predecessors || [])], successors: [],
    };
  }

  const nodes = Object.values(nodeMap);
  // Sort by topological order for display
  const allIds = new Set([...topo, ...mils.map(m => m.id)]);
  const ordered = [];
  for (const id of topo) ordered.push(nodeMap[id]);
  for (const m of mils) if (nodeMap[m.id]) ordered.push(nodeMap[m.id]);

  return { nodes: ordered, criticalIds, totalDuration: numDays, baseDate, numDays, baseMs };
}

export function getCriticalPathTasks(tasks) {
  const r = computeCriticalPath(tasks);
  const criticalPathTasks = tasks.filter(t => r.criticalIds.includes(t.id))
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  return { ...r, criticalPathTasks };
}
