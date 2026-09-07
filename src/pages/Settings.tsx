import { useState } from 'react';
import { useStudyStore } from '../store/studyStore';
import { resetProgress, resetEverything } from '../services/progressService';
import { toast } from 'react-hot-toast';
import { AlertTriangle, UserCheck, Trash2 } from 'lucide-react';

export default function Settings() {
  const { user, loadStudentData } = useStudyStore();
  const [resetInput, setResetInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetProgressOnly = async () => {
    if (!user) return;
    if (!window.confirm('Reset all progress marks? This will set all topics back to Not Started.')) return;

    setLoading(true);
    try {
      await resetProgress(user.uid);
      await loadStudentData(user.uid);
      toast.success('All progress reset');
    } catch {
      toast.error('Failed to reset');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWipe = async () => {
    if (!user || resetInput.trim() !== 'RESET') return;
    setLoading(true);
    try {
      await resetEverything(user.uid);
      await loadStudentData(user.uid);
      toast.success('All tracker data reset');
      setResetInput('');
    } catch {
      toast.error('Wipe failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
          Application Settings
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Profile, local preferences, and database resets
        </p>
      </div>

      {/* Session Profile */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-pink-500" />
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
            Active Session
          </h2>
        </div>
        <div className="divide-y divide-zinc-100 text-xs">
          <div className="py-2.5 flex justify-between">
            <span className="text-zinc-400">User Identity</span>
            <span className="font-semibold text-zinc-800">{user?.displayName}</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-zinc-400">Assigned Role</span>
            <span className="font-semibold text-pink-600 capitalize">{user?.role}</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-zinc-400">Security Gate</span>
            <span className="font-medium text-emerald-600">Access Code Verified</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-3xl p-6 border border-red-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Danger Zone
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-xs font-bold text-zinc-800">Clear Completion Progress</div>
              <div className="text-[11px] text-zinc-400">Reset checkboxes without removing personal notes.</div>
            </div>
            <button
              onClick={handleResetProgressOnly}
              disabled={loading}
              className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition-colors"
            >
              Reset Progress
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-100 space-y-2">
            <div>
              <div className="text-xs font-bold text-zinc-800">Complete Cloud Reset</div>
              <div className="text-[11px] text-zinc-400">
                Permanently wipes all progress, notes, revisions, and custom topics. Type <strong>RESET</strong> below.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                placeholder="Type RESET"
                className="px-3 py-1.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-red-400 w-36"
              />
              <button
                onClick={handleCompleteWipe}
                disabled={resetInput.trim() !== 'RESET' || loading}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
              >
                Execute Full Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
