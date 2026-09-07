import { useState, useRef } from 'react';
import { useStudyStore } from '../store/studyStore';
import { exportJSON, exportCSV, validateImportFile } from '../services/exportService';
import { updateProgress, updateNote } from '../services/progressService';
import { toast } from 'react-hot-toast';
import { FileDown, FileUp, Database, AlertCircle } from 'lucide-react';

export default function ImportExport() {
  const { user, syllabusFlat, loadStudentData } = useStudyStore();
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPayload, setParsedPayload] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = async () => {
    if (!user) return;
    toast.loading('Generating JSON backup...', { id: 'exp' });
    try {
      await exportJSON(user.uid, user.displayName);
      toast.success('Backup downloaded', { id: 'exp' });
    } catch {
      toast.error('Export failed', { id: 'exp' });
    }
  };

  const handleExportCSV = async () => {
    if (!user) return;
    toast.loading('Generating CSV report...', { id: 'exp_csv' });
    try {
      await exportCSV(user.uid, syllabusFlat);
      toast.success('CSV report downloaded', { id: 'exp_csv' });
    } catch {
      toast.error('CSV export failed', { id: 'exp_csv' });
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg('');
    setParsedPayload(null);

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const obj = JSON.parse(ev.target?.result as string);
        if (validateImportFile(obj)) {
          setParsedPayload(obj);
        } else {
          setErrorMsg('Invalid backup schema. Progress data missing.');
        }
      } catch {
        setErrorMsg('Malformed JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const executeImport = async () => {
    if (!user || !parsedPayload) return;
    setImporting(true);
    try {
      if (parsedPayload.progress) {
        for (const [id, item] of Object.entries(parsedPayload.progress as Record<string, any>)) {
          await updateProgress(user.uid, id, item.status, item.priority || 'medium');
        }
      }
      if (parsedPayload.notes) {
        for (const [id, n] of Object.entries(parsedPayload.notes as Record<string, any>)) {
          if (n?.content) {
            await updateNote(user.uid, id, n.content);
          }
        }
      }
      await loadStudentData(user.uid);
      toast.success('Cloud backup successfully restored!');
      setSelectedFile(null);
      setParsedPayload(null);
    } catch {
      toast.error('Failed to import backup');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
          Backup & Migration
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Export full backups or transfer your progress between devices
        </p>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-pink-500" />
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
            Export Data
          </h2>
        </div>
        <p className="text-xs text-zinc-500">
          Save an offline copy of your progress records, revisions, customizations, and notes.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
          >
            <FileDown className="w-4 h-4" />
            <span>Download JSON Backup</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>Export CSV Spreadsheet</span>
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <FileUp className="w-4 h-4 text-pink-500" />
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
            Restore Backup
          </h2>
        </div>
        <p className="text-xs text-zinc-500">
          Upload a previously exported JSON backup file to sync it directly into Firestore.
        </p>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-200 hover:border-pink-300 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-zinc-50/50"
        >
          <FileUp className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-zinc-700">
            {selectedFile ? selectedFile.name : 'Click to select .json backup file'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={onFileChange}
            className="hidden"
          />
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 rounded-xl flex items-center gap-2 text-xs text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {parsedPayload && !errorMsg && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-3">
            <div className="text-xs font-bold text-amber-800">
              Ready to restore {Object.keys(parsedPayload.progress || {}).length} progress records.
            </div>
            <button
              onClick={executeImport}
              disabled={importing}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              {importing ? 'Syncing to Cloud...' : 'Confirm Cloud Restore'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
