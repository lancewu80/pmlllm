import React, { useContext, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { I18nContext } from '../i18n';
import useStore from '../store/useStore';
import { downloadSampleTemplate } from '../utils/exportUtils';

// Read file as XLSX workbook — handles both web (fetch) and native (FileSystem)
async function readWorkbook(uri) {
  if (Platform.OS === 'web') {
    // Web: fetch the blob URI and parse as ArrayBuffer
    const resp = await fetch(uri);
    const buf = await resp.arrayBuffer();
    return XLSX.read(buf, { type: 'array', cellDates: false });
  } else {
    // Native: copy to cache then read as base64
    const FileSystem = await import('expo-file-system');
    const cacheUri = FileSystem.cacheDirectory + 'pmllm_import_' + Date.now() + '.xlsx';
    await FileSystem.copyAsync({ from: uri, to: cacheUri });
    const b64 = await FileSystem.readAsStringAsync(cacheUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    FileSystem.deleteAsync(cacheUri, { idempotent: true }).catch(() => {});
    return XLSX.read(b64, { type: 'base64', cellDates: false });
  }
}

// ── helpers ──────────────────────────────────────────────────
function genId(pfx) { return pfx + Date.now() + Math.floor(Math.random() * 10000); }

// Convert Excel serial date number OR date string to YYYY-MM-DD
function parseDate(v) {
  if (!v && v !== 0) return '';
  if (typeof v === 'number') {
    // Excel date serial: days since 1899-12-30
    const ms = (v - 25569) * 86400000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${d.getUTCFullYear()}-${mm}-${dd}`;
  }
  return String(v).trim().replace(/\//g, '-');
}

function parseNum(v, fallback = 0) {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function parseBool(v) {
  if (typeof v === 'boolean') return v;
  return String(v).trim().toUpperCase() === 'TRUE';
}

function parseProjectsSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return rows
    .map(r => ({
      _rawId: String(r['project_id'] || r['專案ID'] || '').trim(),
      name: String(r['name'] || r['專案名稱'] || '').trim(),
      startDate: parseDate(r['start_date'] || r['開始日期']),
      endDate: parseDate(r['end_date'] || r['結束日期']),
      status: String(r['status'] || r['狀態'] || 'planned').trim() || 'planned',
      description: String(r['description'] || r['描述'] || '').trim(),
    }))
    .filter(r => r.name);
}

function parseTasksSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return rows
    .map(r => ({
      _rawId: String(r['task_id'] || r['任務ID'] || '').trim(),
      _rawProjectId: String(r['project_id'] || r['專案ID'] || '').trim(),
      name: String(r['name'] || r['任務名稱'] || '').trim(),
      description: String(r['description'] || r['描述'] || '').trim(),
      assigneeEmail: String(r['assignee'] || r['負責人'] || '').trim(),
      startDate: parseDate(r['start_date'] || r['開始日期']),
      endDate: parseDate(r['end_date'] || r['結束日期']),
      duration: parseNum(r['duration'] || r['工期(天)'] || r['工期（天）']),
      progress: parseNum(r['progress'] || r['進度%'] || r['進度']),
      status: String(r['status'] || r['狀態'] || 'notStarted').trim() || 'notStarted',
      isMilestone: parseBool(r['is_milestone'] || r['里程碑(TRUE/FALSE)'] || r['里程碑']),
      _rawPredecessors: String(r['predecessors'] || r['前置任務(逗號分隔)'] || r['前置任務'] || '').trim(),
    }))
    .filter(r => r.name);
}

// ── component ─────────────────────────────────────────────────
export default function ImportScreen() {
  const { t } = useContext(I18nContext);
  const users = useStore(s => s.users);
  const bulkImport = useStore(s => s.bulkImport);

  const [loading, setLoading] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(null);

  async function handleDownloadTemplate() {
    setDlLoading(true);
    try { await downloadSampleTemplate(); } catch (e) { /* ignore */ }
    finally { setDlLoading(false); }
  }

  async function pickAndParse() {
    setLoading(true);
    setPreview(null);
    setDone(null);
    setErrMsg('');
    setDebugInfo('');

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        setErrMsg('未選取任何檔案。');
        setLoading(false);
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      setDebugInfo(`Platform: ${Platform.OS}\nURI: ${uri.substring(0, 80)}…`);

      const wb = await readWorkbook(uri);
      const sheetNames = wb.SheetNames;
      setDebugInfo(prev => prev + `\n工作表: ${sheetNames.join(', ')}`);

      // Detect sheets by name pattern or position (skip README sheet)
      const projSheetName =
        sheetNames.find(n => /^(專案|project)/i.test(n)) ||
        sheetNames.find((_, i) => i === 1) ||
        sheetNames[0];

      const taskSheetName =
        sheetNames.find(n => /^(任務|task)/i.test(n)) ||
        sheetNames.find((_, i) => i === 2) ||
        sheetNames[1];

      setDebugInfo(prev => prev + `\n專案表: "${projSheetName}", 任務表: "${taskSheetName}"`);

      const rawProjects = projSheetName && wb.Sheets[projSheetName]
        ? parseProjectsSheet(wb.Sheets[projSheetName])
        : [];
      const rawTasks = taskSheetName && wb.Sheets[taskSheetName]
        ? parseTasksSheet(wb.Sheets[taskSheetName])
        : [];

      setDebugInfo(prev => prev + `\n解析到 ${rawProjects.length} 專案, ${rawTasks.length} 任務`);

      if (rawProjects.length === 0 && rawTasks.length === 0) {
        setErrMsg(
          `找不到有效資料。\n偵測到的工作表: ${sheetNames.join(', ')}\n` +
          `專案欄位需包含「name」或「專案名稱」\n任務欄位需包含「name」或「任務名稱」`
        );
        setLoading(false);
        return;
      }

      // Build id maps
      const projectIdMap = {};
      const taskIdMap = {};

      const projects = {};
      for (const p of rawProjects) {
        const newId = p._rawId || genId('p');
        projectIdMap[p._rawId] = newId;
        projects[newId] = {
          id: newId,
          name: p.name,
          startDate: p.startDate,
          endDate: p.endDate,
          status: p.status,
          description: p.description,
        };
      }

      for (const t of rawTasks) {
        const key = t._rawId || t.name;
        // Use the raw id directly so the same task_id always maps to the same
        // internal id — this lets bulkImport upsert instead of duplicate.
        taskIdMap[key] = t._rawId || genId('t');
      }

      const tasksByProject = {};
      for (const t of rawTasks) {
        const rawPid = t._rawProjectId;
        const pid = projectIdMap[rawPid] || rawPid;
        if (!pid) continue;

        const taskId = taskIdMap[t._rawId || t.name];
        const assigneeUser = t.assigneeEmail
          ? users.find(u => u.email?.toLowerCase() === t.assigneeEmail.toLowerCase())
          : null;

        const predecessors = t._rawPredecessors
          ? t._rawPredecessors.split(',')
              .map(s => s.trim()).filter(Boolean)
              .map(rawId => taskIdMap[rawId] || rawId)
          : [];

        const task = {
          id: taskId,
          rawId: t._rawId || null,   // keep original xlsx task_id for dedup on re-import
          projectId: pid,
          name: t.name,
          description: t.description,
          assignee: assigneeUser?.id || null,
          startDate: t.startDate,
          endDate: t.endDate,
          duration: t.duration,
          progress: t.progress,
          status: t.status,
          isMilestone: t.isMilestone,
          predecessors,
        };

        if (!tasksByProject[pid]) tasksByProject[pid] = [];
        tasksByProject[pid].push(task);
      }

      // Auto-create project stubs for tasks without a matching project
      for (const pid of Object.keys(tasksByProject)) {
        if (!projects[pid]) {
          projects[pid] = {
            id: pid, name: `匯入專案 (${pid})`,
            startDate: '', endDate: '', status: 'planned',
          };
        }
      }

      setPreview({ projects, tasksByProject });
    } catch (e) {
      setErrMsg(`解析失敗: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function confirmImport() {
    if (!preview) return;
    setImporting(true);
    try {
      bulkImport(preview);
      const projCount = Object.keys(preview.projects).length;
      const taskCount = Object.values(preview.tasksByProject).reduce((s, a) => s + a.length, 0);
      setDone({ projCount, taskCount });
      setPreview(null);
      setDebugInfo('');
    } catch (e) {
      setErrMsg(`匯入失敗: ${e?.message || String(e)}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView style={s.c} contentContainerStyle={s.cc}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerIcon}>📥</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>匯入 xlsx 專案</Text>
          <Text style={s.headerSub}>選取符合範本格式的 xlsx 檔案匯入</Text>
        </View>
      </View>

      {/* Download template button */}
      <TouchableOpacity style={s.dlBtn} onPress={handleDownloadTemplate} disabled={dlLoading}>
        {dlLoading
          ? <><ActivityIndicator color="#3498db" size="small" /><Text style={[s.dlBtnT, { marginLeft: 8 }]}>產生中…</Text></>
          : <Text style={s.dlBtnT}>📥  下載匯入範本</Text>
        }
      </TouchableOpacity>

      {/* Pick button */}
      <TouchableOpacity style={s.pickBtn} onPress={pickAndParse} disabled={loading || importing}>
        {loading
          ? <><ActivityIndicator color="#fff" /><Text style={[s.pickBtnT, { marginLeft: 8 }]}>解析中…</Text></>
          : <Text style={s.pickBtnT}>📂  選取 xlsx 檔案</Text>
        }
      </TouchableOpacity>

      {/* Error */}
      {!!errMsg && (
        <View style={s.errCard}>
          <Text style={s.errTitle}>⚠️  錯誤</Text>
          <Text style={s.errText}>{errMsg}</Text>
          {!!debugInfo && <Text style={s.debugText}>{debugInfo}</Text>}
          <TouchableOpacity onPress={() => { setErrMsg(''); setDebugInfo(''); }}>
            <Text style={s.dismissT}>關閉</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Debug info (only when no error) */}
      {!errMsg && !!debugInfo && (
        <View style={s.debugCard}>
          <Text style={s.debugText}>{debugInfo}</Text>
        </View>
      )}

      {/* Success */}
      {done && (
        <View style={s.successCard}>
          <Text style={s.successText}>
            ✅  匯入完成！{done.projCount} 個專案、{done.taskCount} 個任務已加入。
          </Text>
          <TouchableOpacity onPress={() => setDone(null)}>
            <Text style={s.dismissT}>關閉</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Preview */}
      {preview && (
        <View style={s.previewCard}>
          <Text style={s.previewTitle}>預覽匯入內容</Text>
          {Object.values(preview.projects).map(p => {
            const tasks = preview.tasksByProject[p.id] || [];
            return (
              <View key={p.id} style={s.projBlock}>
                <View style={s.projRow}>
                  <Text style={s.projDot}>📁</Text>
                  <Text style={s.projName}>{p.name}</Text>
                  <Text style={s.projBadge}>{tasks.length} 個任務</Text>
                </View>
                {!!p.startDate && (
                  <Text style={s.projDate}>{p.startDate} → {p.endDate}</Text>
                )}
                {tasks.map(t => (
                  <View key={t.id} style={s.taskRow}>
                    <Text style={s.taskDot}>{t.isMilestone ? '◆' : '▸'}</Text>
                    <Text style={s.taskName} numberOfLines={1}>{t.name}</Text>
                    {!!t.startDate && <Text style={s.taskDate}>{t.startDate}</Text>}
                  </View>
                ))}
              </View>
            );
          })}
          <View style={s.previewBtns}>
            <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={() => { setPreview(null); setDebugInfo(''); }}>
              <Text style={s.btnSecondaryT}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={confirmImport} disabled={importing}>
              {importing
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnPrimaryT}>確認匯入</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Instructions */}
      {!preview && !done && !errMsg && (
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>📋  範本格式說明</Text>
          <Text style={s.infoText}>xlsx 需包含兩個工作表：</Text>
          <Text style={s.infoItem}>• <Text style={s.infoKey}>專案</Text>  — project_id, name, start_date, end_date, status</Text>
          <Text style={s.infoItem}>• <Text style={s.infoKey}>任務</Text>  — task_id, project_id, name, assignee, start_date, end_date, progress, status, is_milestone, predecessors</Text>
          <Text style={s.infoNote}>⚠️  建議從 pm_import_template.xlsx 填寫後匯入。</Text>
        </View>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#1a1a2e' },
  cc: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 },
  headerIcon: { fontSize: 36 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#a0a0b0', fontSize: 13, marginTop: 2 },
  dlBtn: { backgroundColor: '#16213e', borderRadius: 10, paddingVertical: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1.5, borderColor: '#3498db' },
  dlBtnT: { color: '#3498db', fontSize: 15, fontWeight: '600' },
  pickBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  pickBtnT: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errCard: { backgroundColor: 'rgba(233,69,96,0.12)', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e94560' },
  errTitle: { color: '#e94560', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  errText: { color: '#ffb3b3', fontSize: 13, lineHeight: 20 },
  debugCard: { backgroundColor: '#0f3460', borderRadius: 8, padding: 10, marginBottom: 12 },
  debugText: { color: '#7f8fa6', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
  dismissT: { color: '#a0a0b0', fontSize: 12, marginTop: 8, textAlign: 'right' },
  successCard: { backgroundColor: 'rgba(46,204,113,0.12)', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2ecc71' },
  successText: { color: '#2ecc71', fontSize: 14 },
  previewCard: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginBottom: 16 },
  previewTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  projBlock: { marginBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 10 },
  projRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  projDot: { fontSize: 16 },
  projName: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  projBadge: { backgroundColor: '#0f3460', color: '#a0a0b0', fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  projDate: { color: '#a0a0b0', fontSize: 12, marginBottom: 6, marginLeft: 24 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingLeft: 24, gap: 6 },
  taskDot: { color: '#3498db', fontSize: 12 },
  taskName: { color: '#c0c0d0', fontSize: 13, flex: 1 },
  taskDate: { color: '#666', fontSize: 11 },
  previewBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  btnSecondary: { backgroundColor: '#0f3460' },
  btnSecondaryT: { color: '#a0a0b0', fontSize: 14 },
  btnPrimary: { backgroundColor: '#e94560' },
  btnPrimaryT: { color: '#fff', fontSize: 14, fontWeight: '600' },
  infoCard: { backgroundColor: '#16213e', borderRadius: 12, padding: 16 },
  infoTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 10 },
  infoText: { color: '#a0a0b0', fontSize: 13, marginBottom: 8 },
  infoItem: { color: '#c0c0d0', fontSize: 13, lineHeight: 24 },
  infoKey: { color: '#e94560', fontWeight: '600' },
  infoNote: { color: '#f39c12', fontSize: 12, marginTop: 12, lineHeight: 18 },
});
