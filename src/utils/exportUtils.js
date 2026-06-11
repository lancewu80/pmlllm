import * as XLSX from 'xlsx-js-style';
import { Platform } from 'react-native';
import { computeCriticalPath } from './criticalPath';

// ── Color palette (matches pm_import_template.xlsx) ──────────────────────────
const C = {
  HEADER_BG:  '1A237E',  // deep indigo
  HEADER_FG:  'FFFFFF',
  SUBHDR_BG:  '283593',
  PROJ_BG:    'E8EAF6',  // light indigo
  TASK_EVEN:  'EDE7F6',  // lavender
  SECTION_BG: '37474F',  // dark blue-gray
  SECTION_FG: 'FFFFFF',
  REQ_BG:     'FFEBEE',  // light red
  OPT_BG:     'E8F5E9',  // light green
  NOTE_BG:    'FFF9C4',  // yellow
  BORDER:     'B0BEC5',
  WHITE:      'FFFFFF',
  GRAY:       'F5F5F5',
};

const STATUS_ZH = {
  notStarted: '未開始', inProgress: '進行中', completed: '已完成',
  blocked: '受阻', planned: '規劃中', onHold: '暫停',
};
function fmtStatus(s) { return STATUS_ZH[s] || s || '—'; }
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Style helpers ─────────────────────────────────────────────────────────────
function bdr() {
  const s = { style: 'thin', color: { rgb: C.BORDER } };
  return { top: s, bottom: s, left: s, right: s };
}

function hdrStyle() {
  return {
    fill: { fgColor: { rgb: C.HEADER_BG } },
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: C.HEADER_FG } },
    border: bdr(),
    alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
  };
}

function subHdrStyle() {
  return {
    fill: { fgColor: { rgb: C.SUBHDR_BG } },
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: C.HEADER_FG } },
    border: bdr(),
    alignment: { horizontal: 'center', vertical: 'center' },
  };
}

function sectStyle() {
  return {
    fill: { fgColor: { rgb: C.SECTION_BG } },
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: C.SECTION_FG } },
    border: bdr(),
    alignment: { horizontal: 'left', vertical: 'center' },
  };
}

function cellStyle(bgRgb = C.WHITE, opts = {}) {
  return {
    fill: { fgColor: { rgb: bgRgb } },
    font: { name: 'Calibri', sz: 10, color: { rgb: '000000' }, ...opts.font },
    border: bdr(),
    alignment: { horizontal: opts.h || 'left', vertical: 'center', wrapText: !!opts.wrap },
  };
}

function noteStyle(bgRgb = C.GRAY) {
  return {
    fill: { fgColor: { rgb: bgRgb } },
    font: { name: 'Calibri', sz: 10, color: { rgb: '795548' } },
    border: bdr(),
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  };
}

// Build a cell object: { v: value, t: type, s: style }
function mc(value, style, type) {
  const t = type || (typeof value === 'number' ? 'n' : 's');
  return { v: value ?? '', t, s: style };
}

// ── Sheet builders ────────────────────────────────────────────────────────────

/**
 * Build the 說明 (README) sheet data as array-of-arrays of cell objects.
 */
function buildNoteSheetData() {
  const rows = [];

  // Row 1: title (merged A1:E1 handled via !merges)
  rows.push([
    mc('📋  PMLLM 專案管理 — 匯入/匯出範本說明', {
      fill: { fgColor: { rgb: C.HEADER_BG } },
      font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: C.HEADER_FG } },
      border: bdr(),
      alignment: { horizontal: 'center', vertical: 'center' },
    }),
    mc('', cellStyle(C.HEADER_BG)),
    mc('', cellStyle(C.HEADER_BG)),
    mc('', cellStyle(C.HEADER_BG)),
    mc('', cellStyle(C.HEADER_BG)),
  ]);

  // Row 2: tip (merged)
  const tipSty = noteStyle(C.NOTE_BG);
  rows.push([
    mc('📌  請勿刪除標題列。日期格式：YYYY-MM-DD。predecessors 以逗號分隔多個 task_id。', tipSty),
    mc('', tipSty), mc('', tipSty), mc('', tipSty), mc('', tipSty),
  ]);

  // Row 3: blank
  rows.push([mc('',cellStyle()), mc('',cellStyle()), mc('',cellStyle()), mc('',cellStyle()), mc('',cellStyle())]);

  // Row 4: column headers
  rows.push(['欄位名稱','顯示名稱','必填','範例值','說明'].map(h => mc(h, subHdrStyle())));

  const sect = (title) => {
    const s = sectStyle();
    return [mc(title,s), mc('',s), mc('',s), mc('',s), mc('',s)];
  };
  const frow = (col, name, req, ex, note = '') => {
    const bg = req ? C.REQ_BG : C.OPT_BG;
    return [
      mc(col,   cellStyle(bg)),
      mc(name,  cellStyle(bg)),
      mc(req ? '✔ 必填' : '選填', cellStyle(bg, { h: 'center' })),
      mc(ex,    cellStyle(C.GRAY, { wrap: true })),
      mc(note,  cellStyle(C.GRAY, { wrap: true })),
    ];
  };

  rows.push(sect('【專案工作表 — 欄位說明】'));
  rows.push(frow('project_id',  '專案 ID',   true,  'P001',          '英數字，全檔唯一'));
  rows.push(frow('name',        '專案名稱',  true,  '電商平台開發',   ''));
  rows.push(frow('start_date',  '開始日期',  false, '2026-06-01',    'YYYY-MM-DD'));
  rows.push(frow('end_date',    '結束日期',  false, '2026-12-31',    'YYYY-MM-DD'));
  rows.push(frow('status',      '狀態',      false, 'planned',       'planned / inProgress / completed / onHold'));
  rows.push(frow('description', '說明',      false, '專案描述...',    ''));

  rows.push([mc('',cellStyle()), mc('',cellStyle()), mc('',cellStyle()), mc('',cellStyle()), mc('',cellStyle())]);

  rows.push(sect('【任務工作表 — 欄位說明】'));
  rows.push(frow('task_id',      '任務 ID',   true,  'T001',          '英數字，全檔唯一'));
  rows.push(frow('project_id',   '所屬專案',  true,  'P001',          '對應專案工作表 project_id'));
  rows.push(frow('name',         '任務名稱',  true,  '需求分析',       ''));
  rows.push(frow('description',  '說明',      false, '收集需求...',    ''));
  rows.push(frow('assignee',     '負責人',    false, 'user@co.com',   '使用者 Email'));
  rows.push(frow('start_date',   '開始日期',  false, '2026-06-01',    'YYYY-MM-DD'));
  rows.push(frow('end_date',     '結束日期',  false, '2026-06-14',    'YYYY-MM-DD'));
  rows.push(frow('duration',     '工期(天)',  false, '14',            '里程碑填 0'));
  rows.push(frow('progress',     '進度 %',    false, '0',             '0–100'));
  rows.push(frow('status',       '狀態',      false, 'notStarted',    'notStarted / inProgress / completed / blocked'));
  rows.push(frow('is_milestone', '里程碑',    false, 'FALSE',         'TRUE 或 FALSE'));
  rows.push(frow('predecessors', '前置任務',  false, 'T001,T002',     '多個以逗號分隔'));

  return rows;
}

// ── Template xlsx (same format & style as import template — re-importable) ───

export function buildTemplateWb(pids, projects, tasksByProject, users) {
  const wb = XLSX.utils.book_new();
  const userById = Object.fromEntries((users || []).map(u => [u.id, u]));

  // ── 說明 sheet ──
  const noteData = buildNoteSheetData();
  const wsNote = XLSX.utils.aoa_to_sheet(noteData);
  wsNote['!cols'] = [22, 18, 12, 36, 22].map(w => ({ wch: w }));
  wsNote['!rows'] = [{ hpt: 30 }, { hpt: 22 }];
  wsNote['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },   // title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },   // tip
    // section rows (rows 4, 11): merge cols
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },
    { s: { r: 12, c: 0 }, e: { r: 12, c: 4 } },
    // blank rows
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    { s: { r: 11, c: 0 }, e: { r: 11, c: 4 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsNote, '說明');

  // ── 專案 sheet ──
  const projHeader = ['project_id', 'name', 'start_date', 'end_date', 'status', 'description'];
  const projRows = [
    projHeader.map(h => mc(h, hdrStyle())),
    ...pids.map((pid, ridx) => {
      const p = projects[pid] || {};
      const bg = ridx % 2 === 0 ? C.PROJ_BG : C.WHITE;
      return [
        mc(p.id || pid,        cellStyle(bg)),
        mc(p.name || '',       cellStyle(bg)),
        mc(p.startDate || '',  cellStyle(bg)),
        mc(p.endDate || '',    cellStyle(bg)),
        mc(p.status || 'planned', cellStyle(bg)),
        mc(p.description || '', cellStyle(bg, { wrap: true })),
      ];
    }),
  ];
  const wsProj = XLSX.utils.aoa_to_sheet(projRows);
  wsProj['!cols'] = [14, 26, 14, 14, 16, 40].map(w => ({ wch: w }));
  wsProj['!rows'] = [{ hpt: 24 }];
  XLSX.utils.book_append_sheet(wb, wsProj, '專案');

  // ── 任務 sheet ──
  const taskHeader = [
    'task_id', 'project_id', 'name', 'description', 'assignee',
    'start_date', 'end_date', 'duration', 'progress',
    'status', 'is_milestone', 'predecessors',
  ];

  // Build internal-id → sequential-T-id mapping
  const idMap = {};
  let seq = 1;
  for (const pid of pids) {
    for (const t of (tasksByProject[pid] || [])) {
      idMap[t.id] = 'T' + String(seq++).padStart(3, '0');
    }
  }

  const taskRows = [
    taskHeader.map(h => mc(h, hdrStyle())),
  ];
  let globalIdx = 0;
  for (const pid of pids) {
    for (const t of (tasksByProject[pid] || [])) {
      const bg = globalIdx % 2 === 0 ? C.WHITE : C.TASK_EVEN;
      globalIdx++;
      const email = userById[t.assignee]?.email || t.assignee || '';
      const predStr = (t.predecessors || [])
        .map(id => idMap[id] || id).filter(Boolean).join(',');
      taskRows.push([
        mc(idMap[t.id],              cellStyle(bg)),
        mc(pid,                       cellStyle(bg)),
        mc(t.name || '',              cellStyle(bg)),
        mc(t.description || '',       cellStyle(bg, { wrap: true })),
        mc(email,                     cellStyle(bg)),
        mc(t.startDate || '',         cellStyle(bg)),
        mc(t.endDate || '',           cellStyle(bg)),
        mc(Number(t.duration) || 0,   cellStyle(bg, { h: 'center' }), 'n'),
        mc(Number(t.progress) || 0,   cellStyle(bg, { h: 'center' }), 'n'),
        mc(t.status || 'notStarted',  cellStyle(bg)),
        mc(t.isMilestone ? 'TRUE' : 'FALSE', cellStyle(bg, { h: 'center' })),
        mc(predStr,                   cellStyle(bg)),
      ]);
    }
  }

  const wsTask = XLSX.utils.aoa_to_sheet(taskRows);
  wsTask['!cols'] = [12, 12, 24, 32, 24, 14, 14, 10, 10, 14, 13, 18].map(w => ({ wch: w }));
  wsTask['!rows'] = [{ hpt: 24 }];
  XLSX.utils.book_append_sheet(wb, wsTask, '任務');

  return wb;
}

// ── Full xlsx ─────────────────────────────────────────────────────────────────

export function buildFullWb(pids, projects, tasksByProject, users) {
  const wb = XLSX.utils.book_new();
  const userById = Object.fromEntries((users || []).map(u => [u.id, u]));
  const now = new Date().toLocaleDateString('zh-TW');

  for (const pid of pids) {
    const p = projects[pid] || { name: pid };
    const tasks = tasksByProject[pid] || [];
    const cpResult = computeCriticalPath(tasks) || {};
    const critSet = new Set(cpResult.criticalIds || []);
    const shortName = (p.name || pid).substring(0, 18).replace(/[\\/*?[\]]/g, '_');

    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'completed').length;
    const active = tasks.filter(t => t.status === 'inProgress').length;
    const overdue = tasks.filter(t =>
      t.status !== 'completed' && t.endDate && new Date(t.endDate) < new Date()
    ).length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    const milestones = tasks.filter(t => t.isMilestone);

    // 儀表板
    const dashRows = [
      [mc('PMLLM 專案報告', hdrStyle()), mc(now, hdrStyle())],
      [mc(''),mc('')],
      [mc('專案', cellStyle(C.SUBHDR_BG, { font: { color: { rgb: C.HEADER_FG }, bold: true } })),
       mc(p.name || '—', cellStyle(C.PROJ_BG))],
      [mc('期間', cellStyle(C.GRAY)), mc(`${p.startDate||'—'} → ${p.endDate||'—'}`, cellStyle())],
      [mc('狀態', cellStyle(C.GRAY)), mc(fmtStatus(p.status), cellStyle())],
      [mc(''),mc('')],
      [mc('指標', subHdrStyle()), mc('數值', subHdrStyle())],
      [mc('總任務數', cellStyle(C.GRAY)), mc(total, cellStyle(), 'n')],
      [mc('已完成', cellStyle(C.GRAY)), mc(`${done} (${pct}%)`, cellStyle())],
      [mc('進行中', cellStyle(C.GRAY)), mc(active, cellStyle(), 'n')],
      [mc('逾期', cellStyle(C.GRAY)), mc(overdue, cellStyle(), 'n')],
      [mc('里程碑數', cellStyle(C.GRAY)), mc(milestones.length, cellStyle(), 'n')],
      [mc('要徑工期(天)', cellStyle(C.GRAY)), mc(cpResult.totalDuration || 0, cellStyle(), 'n')],
      [mc('要徑任務數', cellStyle(C.GRAY)), mc((cpResult.criticalIds||[]).length, cellStyle(), 'n')],
    ];
    const wsDash = XLSX.utils.aoa_to_sheet(dashRows);
    wsDash['!cols'] = [{ wch: 18 }, { wch: 30 }];
    wsDash['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:1} }];
    XLSX.utils.book_append_sheet(wb, wsDash, `儀表板_${shortName}`);

    // 任務列表
    const tlHeader = ['#','任務名稱','說明','負責人','開始日期','結束日期','工期(天)','進度%','狀態','里程碑','前置任務','要徑'];
    const tlRows = [
      tlHeader.map(h => mc(h, hdrStyle())),
      ...tasks.map((t, i) => {
        const bg = i % 2 === 0 ? C.WHITE : C.TASK_EVEN;
        return [
          mc(i+1, cellStyle(bg, {h:'center'}), 'n'),
          mc(t.name, cellStyle(bg)),
          mc(t.description||'', cellStyle(bg, {wrap:true})),
          mc(userById[t.assignee]?.name || t.assignee || '', cellStyle(bg)),
          mc(t.startDate||'', cellStyle(bg)),
          mc(t.endDate||'', cellStyle(bg)),
          mc(Number(t.duration)||0, cellStyle(bg, {h:'center'}), 'n'),
          mc(Number(t.progress)||0, cellStyle(bg, {h:'center'}), 'n'),
          mc(fmtStatus(t.status), cellStyle(bg)),
          mc(t.isMilestone ? '是' : '否', cellStyle(bg, {h:'center'})),
          mc((t.predecessors||[]).join(', '), cellStyle(bg)),
          mc(critSet.has(t.id) ? '★' : '', cellStyle(bg, {h:'center'})),
        ];
      }),
    ];
    const wsTl = XLSX.utils.aoa_to_sheet(tlRows);
    wsTl['!cols'] = [5,24,32,16,12,12,9,8,12,9,14,7].map(w=>({wch:w}));
    wsTl['!rows'] = [{hpt:24}];
    XLSX.utils.book_append_sheet(wb, wsTl, `任務_${shortName}`);

    // 甘特資料
    const ganttSorted = [...tasks].sort((a,b)=>(a.startDate||'').localeCompare(b.startDate||''));
    const gHeader = ['任務名稱','開始日期','結束日期','工期(天)','進度%','狀態','里程碑','要徑'];
    const gRows = [
      gHeader.map(h => mc(h, hdrStyle())),
      ...ganttSorted.map((t, i) => {
        const bg = i%2===0 ? C.WHITE : C.TASK_EVEN;
        return [
          mc(t.name, cellStyle(bg)),
          mc(t.startDate||'', cellStyle(bg)),
          mc(t.endDate||'', cellStyle(bg)),
          mc(Number(t.duration)||0, cellStyle(bg,{h:'center'}), 'n'),
          mc(Number(t.progress)||0, cellStyle(bg,{h:'center'}), 'n'),
          mc(fmtStatus(t.status), cellStyle(bg)),
          mc(t.isMilestone?'是':'否', cellStyle(bg,{h:'center'})),
          mc(critSet.has(t.id)?'★':'', cellStyle(bg,{h:'center'})),
        ];
      }),
    ];
    const wsG = XLSX.utils.aoa_to_sheet(gRows);
    wsG['!cols'] = [24,12,12,9,8,12,9,7].map(w=>({wch:w}));
    wsG['!rows'] = [{hpt:24}];
    XLSX.utils.book_append_sheet(wb, wsG, `甘特_${shortName}`);

    // PERT / 要徑
    const nodes = cpResult.nodes || [];
    const taskById = Object.fromEntries(tasks.map(t => [t.id, t]));
    const pHeader = ['任務名稱','開始日期','結束日期','工期(天)','ES','EF','LS','LF','浮時(天)','要徑'];
    const pRows = [
      pHeader.map(h => mc(h, hdrStyle())),
      ...nodes.map((n, i) => {
        const isCrit = critSet.has(n.id);
        const bg = isCrit ? 'FFEBEE' : (i%2===0 ? C.WHITE : C.TASK_EVEN);
        const fnt = isCrit ? { color: { rgb: 'C62828' }, bold: true } : {};
        const tk = taskById[n.id] || {};
        return [
          mc(n.name,           cellStyle(bg, {font:fnt})),
          mc(tk.startDate||'', cellStyle(bg, {font:fnt})),
          mc(tk.endDate||'',   cellStyle(bg, {font:fnt})),
          mc(n.duration||0,    cellStyle(bg, {h:'center',font:fnt}), 'n'),
          mc(n.es??0,          cellStyle(bg, {h:'center'}), 'n'),
          mc(n.ef??0,          cellStyle(bg, {h:'center'}), 'n'),
          mc(n.ls??0,          cellStyle(bg, {h:'center'}), 'n'),
          mc(n.lf??0,          cellStyle(bg, {h:'center'}), 'n'),
          mc(n.float??0,       cellStyle(bg, {h:'center'}), 'n'),
          mc(isCrit?'★':'',   cellStyle(bg, {h:'center'})),
        ];
      }),
    ];
    const wsP = XLSX.utils.aoa_to_sheet(pRows);
    wsP['!cols'] = [24,12,12,9,7,7,7,7,9,7].map(w=>({wch:w}));
    wsP['!rows'] = [{hpt:24}];
    XLSX.utils.book_append_sheet(wb, wsP, `PERT_${shortName}`);
  }

  // 使用者工作量
  const allTasks = pids.flatMap(pid => tasksByProject[pid] || []);
  const uHeader = ['#','姓名','Email','角色','進行中','已完成','總任務'];
  const uRows = [
    uHeader.map(h => mc(h, hdrStyle())),
    ...(users || []).map((u, i) => {
      const my = allTasks.filter(t => t.assignee === u.id || t.assignee === u.email);
      const bg = i%2===0 ? C.WHITE : C.TASK_EVEN;
      return [
        mc(i+1, cellStyle(bg,{h:'center'}), 'n'),
        mc(u.name, cellStyle(bg)),
        mc(u.email||'', cellStyle(bg)),
        mc(u.role||'', cellStyle(bg)),
        mc(my.filter(t=>t.status==='inProgress').length, cellStyle(bg,{h:'center'}), 'n'),
        mc(my.filter(t=>t.status==='completed').length, cellStyle(bg,{h:'center'}), 'n'),
        mc(my.length, cellStyle(bg,{h:'center'}), 'n'),
      ];
    }),
  ];
  const wsU = XLSX.utils.aoa_to_sheet(uRows);
  wsU['!cols'] = [5,18,26,12,9,9,9].map(w=>({wch:w}));
  wsU['!rows'] = [{hpt:24}];
  XLSX.utils.book_append_sheet(wb, wsU, '使用者工作量');

  return wb;
}

// ── HTML PDF report ───────────────────────────────────────────────────────────

export function buildReportHTML(pids, projects, tasksByProject, users) {
  const userById = Object.fromEntries((users || []).map(u => [u.id, u]));
  const now = new Date().toLocaleString('zh-TW');

  const STATUS_COLOR = {
    notStarted: '#95a5a6', inProgress: '#3498db', completed: '#2ecc71',
    blocked: '#e74c3c', planned: '#95a5a6', onHold: '#f39c12',
  };

  function ganttHtml(tasks) {
    const sorted = [...tasks].sort((a, b) => (a.startDate||'').localeCompare(b.startDate||''));
    const dateStrs = sorted.flatMap(t => [t.startDate, t.endDate]).filter(Boolean).sort();
    if (!dateStrs.length) return '<p style="color:#999;font-size:12px">任務缺少日期</p>';
    const minMs = new Date(dateStrs[0]).getTime();
    const maxMs = new Date(dateStrs[dateStrs.length-1]).getTime();
    const spanMs = maxMs - minMs || 86400000;

    const rows = sorted.map(t => {
      const sMs = t.startDate ? new Date(t.startDate).getTime() : minMs;
      const eMs = t.endDate   ? new Date(t.endDate).getTime()   : sMs + 86400000;
      const left  = ((sMs - minMs) / spanMs * 100).toFixed(1);
      const width = Math.max(0.5, (eMs - sMs) / spanMs * 100).toFixed(1);
      const progW = (parseFloat(width) * (t.progress||0) / 100).toFixed(1);
      const barColor = t.isMilestone ? '#f39c12' : '#3498db';
      return `<tr>
        <td style="padding:3px 8px;font-size:11px;white-space:nowrap;width:140px;overflow:hidden;border-bottom:1px solid #eee">
          ${t.isMilestone ? '◆ ' : ''}${escHtml(t.name)}</td>
        <td style="padding:3px 8px;font-size:10px;color:#999;width:75px;border-bottom:1px solid #eee">${t.startDate||''}</td>
        <td style="padding:3px 8px;font-size:10px;color:#999;width:75px;border-bottom:1px solid #eee">${t.endDate||''}</td>
        <td style="padding:3px 4px;border-bottom:1px solid #eee">
          <div style="position:relative;height:16px;background:#edf2f7;border-radius:3px">
            <div style="position:absolute;left:${left}%;width:${width}%;min-width:3px;height:100%;background:${barColor};border-radius:3px;opacity:0.7"></div>
            ${t.progress>0?`<div style="position:absolute;left:${left}%;width:${progW}%;min-width:0;height:100%;background:#2ecc71;border-radius:3px;opacity:0.6"></div>`:''}
          </div></td>
        <td style="padding:3px 8px;font-size:10px;color:#999;width:36px;text-align:right;border-bottom:1px solid #eee">${t.progress||0}%</td>
      </tr>`;
    }).join('');

    return `<div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;min-width:460px">
        <thead><tr>
          <th style="padding:4px 8px;text-align:left;font-size:10px;color:#666;font-weight:500;width:140px">任務</th>
          <th style="padding:4px 8px;text-align:left;font-size:10px;color:#666;font-weight:500;width:75px">開始</th>
          <th style="padding:4px 8px;text-align:left;font-size:10px;color:#666;font-weight:500;width:75px">結束</th>
          <th style="padding:4px 8px;font-size:10px;color:#666;font-weight:500">
            <div style="display:flex;justify-content:space-between;color:#aaa;font-size:9px">
              <span>${dateStrs[0]}</span><span>${dateStrs[dateStrs.length-1]}</span></div></th>
          <th style="padding:4px 8px;text-align:right;font-size:10px;color:#666;font-weight:500;width:36px">進度</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }

  function taskTableHtml(tasks) {
    if (!tasks.length) return '<p style="color:#999;font-size:12px">無任務</p>';
    const rows = tasks.map((t, i) => {
      const sc = STATUS_COLOR[t.status] || '#95a5a6';
      return `<tr style="background:${i%2?'#f8fafc':'#fff'}">
        <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee">${i+1}</td>
        <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee">${escHtml(t.name)}${t.isMilestone?' ◆':''}</td>
        <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee;color:#666">${escHtml(userById[t.assignee]?.name||t.assignee||'')}</td>
        <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee;color:#666">${t.startDate||''}</td>
        <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee;color:#666">${t.endDate||''}</td>
        <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee;text-align:center">
          <span style="background:${sc};color:#fff;padding:2px 7px;border-radius:10px;font-size:10px">${fmtStatus(t.status)}</span></td>
        <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #eee;text-align:right">${t.progress||0}%</td>
      </tr>`;
    }).join('');
    return `<table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#1a237e;color:#fff">
        <th style="padding:7px 8px;text-align:left;font-size:11px">#</th>
        <th style="padding:7px 8px;text-align:left;font-size:11px">任務名稱</th>
        <th style="padding:7px 8px;text-align:left;font-size:11px">負責人</th>
        <th style="padding:7px 8px;text-align:left;font-size:11px">開始</th>
        <th style="padding:7px 8px;text-align:left;font-size:11px">結束</th>
        <th style="padding:7px 8px;text-align:center;font-size:11px">狀態</th>
        <th style="padding:7px 8px;text-align:right;font-size:11px">進度</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  const sections = pids.map(pid => {
    const p = projects[pid] || { name: pid };
    const tasks = tasksByProject[pid] || [];
    const cpResult = computeCriticalPath(tasks) || {};
    const critSet = new Set(cpResult.criticalIds || []);
    const critNodes = (cpResult.nodes||[]).filter(n => critSet.has(n.id));

    const total = tasks.length;
    const done  = tasks.filter(t => t.status === 'completed').length;
    const active = tasks.filter(t => t.status === 'inProgress').length;
    const overdue = tasks.filter(t =>
      t.status !== 'completed' && t.endDate && new Date(t.endDate) < new Date()
    ).length;
    const pct = total > 0 ? Math.round(done/total*100) : 0;
    const critPath = critNodes.map(n => escHtml(n.name)).join(' → ');

    const taskById = Object.fromEntries(tasks.map(t => [t.id, t]));
    const pertRows = (cpResult.nodes||[]).map((n, i) => {
      const tk = taskById[n.id] || {};
      const isCrit = critSet.has(n.id);
      return `
      <tr style="background:${isCrit?'#fff0f0':(i%2?'#f8fafc':'#fff')}">
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;${isCrit?'color:#c62828;font-weight:600':''}">${escHtml(n.name)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;color:#666">${tk.startDate||''}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;color:#666">${tk.endDate||''}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:center">${n.duration||0}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:center">${n.es??0}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:center">${n.ef??0}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:center">${n.ls??0}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:center">${n.lf??0}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:center">${n.float??0}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;font-size:11px;text-align:center">${isCrit?'★':''}</td>
      </tr>`;
    }).join('');

    return `
    <div class="proj-section">
      <div class="proj-header">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <h2 style="margin:0;font-size:18px">${escHtml(p.name||'—')}</h2>
          <span class="badge">${fmtStatus(p.status)}</span>
        </div>
        <div style="font-size:12px;opacity:0.75;margin-top:4px">${p.startDate||'?'} → ${p.endDate||'?'}</div>
      </div>
      <div class="proj-body">
        <h3 class="sec-title blue">儀表板</h3>
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-n">${total}</div><div class="stat-l">總任務數</div></div>
          <div class="stat-card"><div class="stat-n" style="color:#2ecc71">${done}</div><div class="stat-l">已完成</div></div>
          <div class="stat-card"><div class="stat-n" style="color:#3498db">${active}</div><div class="stat-l">進行中</div></div>
          <div class="stat-card"><div class="stat-n" style="color:#e74c3c">${overdue}</div><div class="stat-l">逾期</div></div>
          <div class="stat-card"><div class="stat-n" style="color:#1a237e">${cpResult.totalDuration||0}</div><div class="stat-l">要徑工期(天)</div></div>
        </div>
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:4px">
            <span>專案進度</span><span style="font-weight:700;color:#1a237e">${pct}%</span>
          </div>
          <div style="background:#e0e0e0;height:10px;border-radius:5px;overflow:hidden">
            <div style="background:#1a237e;width:${pct}%;height:100%;border-radius:5px"></div>
          </div>
        </div>
        <h3 class="sec-title blue">任務列表</h3>
        ${taskTableHtml(tasks)}
        <h3 class="sec-title blue" style="margin-top:20px">甘特圖</h3>
        ${ganttHtml(tasks)}
        <h3 class="sec-title red" style="margin-top:20px">要徑分析</h3>
        <div style="background:#fff0f0;border:1px solid #fde;border-radius:6px;padding:12px;margin-bottom:10px">
          <span style="font-size:12px;color:#666">總工期：</span>
          <strong style="color:#c62828">${cpResult.totalDuration||0} 天</strong>
          <span style="margin-left:16px;font-size:12px;color:#666">要徑任務：</span>
          <strong>${(cpResult.criticalIds||[]).length}</strong>
          ${critPath?`<div style="font-size:11px;color:#666;margin-top:6px;line-height:1.7">路徑：${critPath}</div>`:''}
        </div>
        ${pertRows?`
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#1a237e;color:#fff">
            <th style="padding:6px 8px;text-align:left;font-size:11px">任務</th>
            <th style="padding:6px 8px;text-align:left;font-size:11px">開始</th>
            <th style="padding:6px 8px;text-align:left;font-size:11px">結束</th>
            <th style="padding:6px 8px;text-align:center;font-size:11px">工期</th>
            <th style="padding:6px 8px;text-align:center;font-size:11px">ES</th>
            <th style="padding:6px 8px;text-align:center;font-size:11px">EF</th>
            <th style="padding:6px 8px;text-align:center;font-size:11px">LS</th>
            <th style="padding:6px 8px;text-align:center;font-size:11px">LF</th>
            <th style="padding:6px 8px;text-align:center;font-size:11px">浮時</th>
            <th style="padding:6px 8px;text-align:center;font-size:11px">要徑</th>
          </tr></thead>
          <tbody>${pertRows}</tbody>
        </table>`:''}
      </div>
    </div>`;
  }).join('');

  const allTasks = pids.flatMap(pid => tasksByProject[pid] || []);
  const userRows = (users||[]).map((u, i) => {
    const my = allTasks.filter(t => t.assignee === u.id || t.assignee === u.email);
    const myActive = my.filter(t => t.status === 'inProgress').length;
    const myDone   = my.filter(t => t.status === 'completed').length;
    const maxLoad  = Math.max(1, ...((users||[]).map(u2 =>
      allTasks.filter(t => t.assignee===u2.id||t.assignee===u2.email).length)));
    const barW = Math.round(my.length / maxLoad * 100);
    return `<tr style="background:${i%2?'#f8fafc':'#fff'}">
      <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #eee">${escHtml(u.name)}</td>
      <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #eee;color:#666">${escHtml(u.email||'')}</td>
      <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #eee;color:#666">${escHtml(u.role||'')}</td>
      <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #eee;text-align:center;color:#3498db">${myActive}</td>
      <td style="padding:6px 8px;font-size:11px;border-bottom:1px solid #eee;text-align:center;color:#2ecc71">${myDone}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="flex:1;background:#edf2f7;height:8px;border-radius:4px;overflow:hidden">
            <div style="width:${barW}%;height:100%;background:#1a237e;border-radius:4px"></div>
          </div>
          <span style="font-size:11px;color:#666;width:20px;text-align:right">${my.length}</span>
        </div>
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PMLLM 專案報告</title>
<style>
*{box-sizing:border-box}
body{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;color:#1a237e;margin:0;padding:20px;background:#f5f7fa;font-size:14px}
.proj-section{background:#fff;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:28px;overflow:hidden}
.proj-header{background:#1a237e;color:#fff;padding:16px 20px}
.proj-body{padding:20px}
.badge{background:rgba(255,255,255,.2);padding:3px 12px;border-radius:12px;font-size:12px}
.sec-title{font-size:13px;margin:0 0 10px 0;padding-bottom:6px;font-weight:600;color:#1a237e}
.sec-title.blue{border-bottom:2px solid #283593}
.sec-title.red{border-bottom:2px solid #c62828}
.stat-grid{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.stat-card{flex:1;min-width:70px;background:#f8fafc;border:1px solid #e8eaf6;border-radius:6px;padding:10px;text-align:center}
.stat-n{font-size:22px;font-weight:700;color:#1a237e}
.stat-l{font-size:10px;color:#666;margin-top:2px}
.no-print{margin-bottom:20px}
@media print{
  body{background:#fff;padding:0}
  .no-print{display:none}
  .proj-section{page-break-inside:avoid}
  *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
}
</style>
</head>
<body>
<div style="background:#1a237e;color:#fff;padding:20px 28px;border-radius:8px;margin-bottom:24px">
  <h1 style="margin:0;font-size:22px;color:#fff">📊 PMLLM 專案報告</h1>
  <p style="margin:4px 0 0;opacity:.7;font-size:12px">匯出時間：${now}　共 ${pids.length} 個專案</p>
</div>
<div class="no-print">
  <button onclick="window.print()" style="background:#1a237e;color:#fff;border:none;padding:10px 22px;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600">🖨️ 列印 / 儲存為 PDF</button>
</div>
${sections}
<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:20px;margin-bottom:40px">
  <h2 style="font-size:15px;color:#1a237e;margin:0 0 14px;border-bottom:2px solid #283593;padding-bottom:6px">👥 團隊成員與工作量</h2>
  <table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:#1a237e;color:#fff">
      <th style="padding:7px 8px;text-align:left;font-size:11px">姓名</th>
      <th style="padding:7px 8px;text-align:left;font-size:11px">Email</th>
      <th style="padding:7px 8px;text-align:left;font-size:11px">角色</th>
      <th style="padding:7px 8px;text-align:center;font-size:11px">進行中</th>
      <th style="padding:7px 8px;text-align:center;font-size:11px">已完成</th>
      <th style="padding:7px 8px;font-size:11px">工作量</th>
    </tr></thead>
    <tbody>${userRows}</tbody>
  </table>
</div>
</body>
</html>`;
}

// ── Sample template download ─────────────────────────────────────────────────

const SAMPLE_PROJECTS = {
  P001: { id: 'P001', name: '電商平台開發',  startDate: '2026-06-01', endDate: '2026-12-31', status: 'planned',    description: '主力電商產品開發' },
  P002: { id: 'P002', name: '行動 App 改版', startDate: '2026-07-01', endDate: '2026-10-31', status: 'inProgress', description: '用戶體驗全面提升' },
  P003: { id: 'P003', name: '資料分析平台',  startDate: '2026-09-01', endDate: '2027-03-31', status: 'planned',    description: 'BI 儀表板與 ETL 管線' },
};
const SAMPLE_TASKS = {
  P001: [
    { id:'T001', rawId:'T001', name:'需求分析與文件', description:'收集利害關係人需求、撰寫 PRD',  assignee:'zhang@example.com', startDate:'2026-06-01', endDate:'2026-06-14', duration:14, progress:0, status:'notStarted', isMilestone:false, predecessors:[] },
    { id:'T002', rawId:'T002', name:'系統架構設計',   description:'確定技術棧與模組切分',          assignee:'li@example.com',    startDate:'2026-06-15', endDate:'2026-06-30', duration:16, progress:0, status:'notStarted', isMilestone:false, predecessors:['T001'] },
    { id:'T003', rawId:'T003', name:'架構 Sign-off',  description:'架構設計里程碑',                assignee:'li@example.com',    startDate:'2026-06-30', endDate:'2026-06-30', duration:0,  progress:0, status:'notStarted', isMilestone:true,  predecessors:['T002'] },
    { id:'T004', rawId:'T004', name:'前端開發',       description:'React Native UI 實作',          assignee:'wang@example.com',  startDate:'2026-07-01', endDate:'2026-08-15', duration:46, progress:0, status:'notStarted', isMilestone:false, predecessors:['T002'] },
    { id:'T005', rawId:'T005', name:'後端 API 開發',  description:'Node.js REST API 與資料庫',     assignee:'chen@example.com',  startDate:'2026-07-01', endDate:'2026-08-15', duration:46, progress:0, status:'notStarted', isMilestone:false, predecessors:['T002'] },
    { id:'T006', rawId:'T006', name:'整合測試',       description:'前後端整合與 E2E 測試',         assignee:'wang@example.com',  startDate:'2026-08-18', endDate:'2026-09-05', duration:19, progress:0, status:'notStarted', isMilestone:false, predecessors:['T004','T005'] },
    { id:'T007', rawId:'T007', name:'效能調校',       description:'載入速度與 DB Query 優化',      assignee:'chen@example.com',  startDate:'2026-09-08', endDate:'2026-09-19', duration:12, progress:0, status:'notStarted', isMilestone:false, predecessors:['T006'] },
    { id:'T008', rawId:'T008', name:'上線部署',       description:'CI/CD + 正式環境部署',          assignee:'li@example.com',    startDate:'2026-09-22', endDate:'2026-09-30', duration:9,  progress:0, status:'notStarted', isMilestone:false, predecessors:['T007'] },
    { id:'T009', rawId:'T009', name:'正式上線',       description:'v1.0 正式對外開放',             assignee:'li@example.com',    startDate:'2026-09-30', endDate:'2026-09-30', duration:0,  progress:0, status:'notStarted', isMilestone:true,  predecessors:['T008'] },
  ],
  P002: [
    { id:'T010', rawId:'T010', name:'市場調研', description:'分析競品與使用者訪談報告', assignee:'zhang@example.com', startDate:'2026-07-01', endDate:'2026-07-21', duration:21, progress:0, status:'notStarted', isMilestone:false, predecessors:[] },
  ],
};

export async function downloadSampleTemplate() {
  const wb = buildTemplateWb(
    ['P001', 'P002', 'P003'],
    SAMPLE_PROJECTS,
    SAMPLE_TASKS,
    [],
  );
  await triggerXlsxDownload(wb, 'pm_import_template.xlsx');
}

// ── Download / Export (platform-aware) ───────────────────────────────────────

export async function triggerXlsxDownload(wb, filename) {
  if (Platform.OS === 'web') {
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const FileSystem = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const uri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(uri, b64, { encoding: 'base64' });
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }
}

export async function triggerPdfExport(html, filename) {
  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
    else alert('請允許瀏覽器開啟新視窗，然後使用「列印 → 儲存為 PDF」。');
  } else {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
  }
}
