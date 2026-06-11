import React, { useContext, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { I18nContext } from '../i18n';
import useStore from '../store/useStore';
import {
  buildTemplateWb, buildFullWb, buildReportHTML,
  triggerXlsxDownload, triggerPdfExport,
} from '../utils/exportUtils';

const FORMATS = [
  {
    key: 'template',
    icon: '🔄',
    label: 'xlsx 範本',
    desc: '與匯入範本相同格式，可在 Excel 修改後再次匯入更新專案',
  },
  {
    key: 'full',
    icon: '📊',
    label: 'xlsx 完整報告',
    desc: '多工作表：儀表板、任務列表、甘特圖資料、PERT / 要徑分析、使用者工作量',
  },
  {
    key: 'pdf',
    icon: '📑',
    label: 'PDF 報告',
    desc: '視覺化完整報告，含甘特圖、進度條、要徑分析（於瀏覽器開啟後列印儲存）',
  },
];

export default function ExportScreen() {
  const { t } = useContext(I18nContext);
  const projects = useStore(s => s.projects);
  const tasksByProject = useStore(s => s.tasksByProject);
  const users = useStore(s => s.users);

  const projectList = useMemo(
    () => Object.values(projects || {}).sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [projects]
  );

  const [selectedPids, setSelectedPids] = useState(() => projectList.map(p => p.id));
  const [formats, setFormats] = useState({ template: true, full: false, pdf: false });
  const [exporting, setExporting] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [doneMsg, setDoneMsg] = useState('');

  const allSelected = selectedPids.length === projectList.length;
  const canExport = selectedPids.length > 0 && Object.values(formats).some(Boolean) && !exporting;

  function togglePid(pid) {
    setSelectedPids(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
    );
  }

  function toggleAll() {
    setSelectedPids(allSelected ? [] : projectList.map(p => p.id));
  }

  function toggleFmt(key) {
    setFormats(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function doExport() {
    if (!canExport) return;
    setExporting(true);
    setErrMsg('');
    setDoneMsg('');

    const safeName = selectedPids.length === 1
      ? (projects[selectedPids[0]]?.name || 'export').replace(/[^\w一-鿿]/g, '_').substring(0, 30)
      : 'pmllm_export';

    const done = [];
    try {
      if (formats.template) {
        const wb = buildTemplateWb(selectedPids, projects, tasksByProject, users);
        await triggerXlsxDownload(wb, `${safeName}_範本.xlsx`);
        done.push('xlsx 範本');
      }
      if (formats.full) {
        const wb = buildFullWb(selectedPids, projects, tasksByProject, users);
        await triggerXlsxDownload(wb, `${safeName}_完整報告.xlsx`);
        done.push('xlsx 完整報告');
      }
      if (formats.pdf) {
        const html = buildReportHTML(selectedPids, projects, tasksByProject, users);
        await triggerPdfExport(html, `${safeName}_報告.pdf`);
        done.push('PDF 報告');
      }
      setDoneMsg(`✅  匯出完成：${done.join('、')}`);
    } catch (e) {
      setErrMsg(`匯出失敗：${e?.message || String(e)}`);
    } finally {
      setExporting(false);
    }
  }

  const taskCount = (pid) => (tasksByProject[pid] || []).length;

  return (
    <ScrollView style={s.c} contentContainerStyle={s.cc}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerIcon}>📤</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>匯出專案</Text>
          <Text style={s.headerSub}>選擇專案與格式，支援 xlsx 及 PDF</Text>
        </View>
      </View>

      {/* ── Project selector ── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>選擇專案</Text>
          <TouchableOpacity onPress={toggleAll} style={s.toggleAllBtn}>
            <Text style={s.toggleAllT}>{allSelected ? '全不選' : '全選'}</Text>
          </TouchableOpacity>
        </View>

        {projectList.length === 0 && (
          <Text style={s.emptyText}>尚無任何專案</Text>
        )}

        {projectList.map(p => {
          const isSelected = selectedPids.includes(p.id);
          const cnt = taskCount(p.id);
          return (
            <TouchableOpacity
              key={p.id}
              style={[s.projRow, isSelected && s.projRowSel]}
              onPress={() => togglePid(p.id)}
            >
              <View style={[s.checkbox, isSelected && s.checkboxSel]}>
                {isSelected && <Text style={s.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.projName, isSelected && { color: '#fff' }]}>{p.name}</Text>
                <Text style={s.projMeta}>
                  {p.startDate || '?'} → {p.endDate || '?'}　{cnt} 個任務
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: statusBg(p.status) }]}>
                <Text style={s.statusBadgeT}>{statusLabel(p.status)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Format selector ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>匯出格式</Text>
        {FORMATS.map(f => {
          const isOn = formats[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.fmtRow, isOn && s.fmtRowSel]}
              onPress={() => toggleFmt(f.key)}
            >
              <View style={[s.checkbox, isOn && s.checkboxSel]}>
                {isOn && <Text style={s.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.fmtIcon}>{f.icon}</Text>
                  <Text style={[s.fmtLabel, isOn && { color: '#fff' }]}>{f.label}</Text>
                </View>
                <Text style={s.fmtDesc}>{f.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Messages ── */}
      {!!errMsg && (
        <View style={s.errCard}>
          <Text style={s.errText}>{errMsg}</Text>
          <TouchableOpacity onPress={() => setErrMsg('')}>
            <Text style={s.dismissT}>關閉</Text>
          </TouchableOpacity>
        </View>
      )}
      {!!doneMsg && (
        <View style={s.successCard}>
          <Text style={s.successText}>{doneMsg}</Text>
          <TouchableOpacity onPress={() => setDoneMsg('')}>
            <Text style={s.dismissT}>關閉</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Export button ── */}
      <TouchableOpacity
        style={[s.exportBtn, !canExport && s.exportBtnDis]}
        onPress={doExport}
        disabled={!canExport}
      >
        {exporting
          ? <><ActivityIndicator color="#fff" size="small" /><Text style={[s.exportBtnT, { marginLeft: 10 }]}>匯出中…</Text></>
          : <Text style={s.exportBtnT}>
              📤  匯出
              {selectedPids.length > 0 ? `（${selectedPids.length} 個專案）` : ''}
            </Text>
        }
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function statusLabel(s) {
  return { planned: '規劃', inProgress: '進行', completed: '完成', onHold: '暫停' }[s] || s || '—';
}
function statusBg(s) {
  return { planned: '#0f3460', inProgress: '#3498db', completed: '#2ecc71', onHold: '#f39c12' }[s] || '#555';
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#1a1a2e' },
  cc: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 },
  headerIcon: { fontSize: 36 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#a0a0b0', fontSize: 13, marginTop: 2 },

  section: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  toggleAllBtn: { backgroundColor: '#0f3460', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  toggleAllT: { color: '#a0a0b0', fontSize: 12 },
  emptyText: { color: '#666', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },

  projRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  projRowSel: { backgroundColor: 'rgba(233,69,96,0.15)', borderWidth: 1, borderColor: 'rgba(233,69,96,0.4)' },
  projName: { color: '#c0c0d0', fontSize: 14, fontWeight: '500' },
  projMeta: { color: '#666', fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusBadgeT: { color: '#fff', fontSize: 10, fontWeight: '600' },

  fmtRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, marginBottom: 4 },
  fmtRowSel: { backgroundColor: 'rgba(52,152,219,0.15)', borderWidth: 1, borderColor: 'rgba(52,152,219,0.4)' },
  fmtIcon: { fontSize: 16 },
  fmtLabel: { color: '#c0c0d0', fontSize: 14, fontWeight: '500' },
  fmtDesc: { color: '#666', fontSize: 11, marginTop: 3, lineHeight: 16 },

  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: '#666', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxSel: { backgroundColor: '#e94560', borderColor: '#e94560' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  errCard: { backgroundColor: 'rgba(233,69,96,0.12)', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e94560' },
  errText: { color: '#ffb3b3', fontSize: 13 },
  successCard: { backgroundColor: 'rgba(46,204,113,0.12)', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#2ecc71' },
  successText: { color: '#2ecc71', fontSize: 13 },
  dismissT: { color: '#a0a0b0', fontSize: 12, marginTop: 6, textAlign: 'right' },

  exportBtn: { backgroundColor: '#e94560', borderRadius: 10, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  exportBtnDis: { opacity: 0.4 },
  exportBtnT: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
