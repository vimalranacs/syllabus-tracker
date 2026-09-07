import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyStore } from '../store/studyStore';
import { findNodeById } from '../data/syllabusNormalizer';
import { Breadcrumbs } from '../components/navigation/Breadcrumbs';
import { StatusIcon } from '../components/ui/StatusIcon';
import { formatDate } from '../utils/dates';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Save,
  Ban,
  Clock,
  BookMarked
} from 'lucide-react';
import type { ItemStatus } from '../types';

export default function TopicDetail() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const {
    syllabusTree,
    progress,
    notes,
    revisions,
    getDisplayTitle,
    updateItemStatus,
    saveNote,
    markRevised,
    user
  } = useStudyStore();
  const isAdmin = user?.role === 'admin';

  const node = useMemo(() => {
    return topicId ? findNodeById(syllabusTree, topicId) : null;
  }, [syllabusTree, topicId]);

  const currentProg = topicId ? progress[topicId] : undefined;
  const currentNote = topicId ? notes[topicId] : undefined;
  const currentRev = topicId ? revisions[topicId] : undefined;

  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNoteContent(currentNote?.content || '');
  }, [currentNote]);

  const status = currentProg?.status || 'not_started';

  const handleStatusToggle = async (newStatus: ItemStatus) => {
    if (!topicId || !node || isAdmin) return;
    await updateItemStatus(topicId, newStatus, node.displayTitle);
    if (newStatus === 'completed') toast.success('Marked as Completed');
    else if (newStatus === 'out_of_syllabus') toast('Topic marked Out of Syllabus', { icon: '⊘' });
    else toast('Status updated');
  };

  const handleRevisionClick = async () => {
    if (!topicId || !node || isAdmin) return;
    await markRevised(topicId, node.displayTitle);
    toast.success('Revision count recorded');
  };

  const handleSaveNotes = async () => {
    if (!topicId || isAdmin) return;
    setIsSaving(true);
    try {
      await saveNote(topicId, noteContent);
      toast.success('Notes saved to cloud');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  const breadcrumbs = useMemo(() => {
    if (!node) return [];
    return node.path.map(p => ({
      label: p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));
  }, [node]);

  if (!node) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-zinc-400">Study item not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="text-xs font-semibold text-pink-600 hover:underline flex items-center gap-1 mx-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Breadcrumbs items={breadcrumbs} />
      </div>

      {/* Main Topic Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {node.stage} · {node.paper}
              </span>
              {node.isStateSpecific && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                  UP Specific
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 leading-snug">
              {getDisplayTitle(node)}
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start">
            <StatusIcon status={status} size="lg" />
            <div className="text-left">
              <div className="text-xs font-bold text-zinc-800 capitalize">
                {status.replace(/_/g, ' ')}
              </div>
              <div className="text-[10px] text-zinc-400">Current Status</div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons for Student */}
        {!isAdmin && (
          <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-zinc-100">
            <button
              onClick={() => handleStatusToggle(status === 'completed' ? 'not_started' : 'completed')}
              className={'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ' + (status === 'completed' ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-pink-500 hover:bg-pink-600 text-white shadow-xs')}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{status === 'completed' ? 'Mark Incomplete' : 'Mark Completed'}</span>
            </button>

            <button
              onClick={() => handleStatusToggle('in_progress')}
              className={'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all ' + (status === 'in_progress' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50')}
            >
              <Clock className="w-4 h-4" />
              <span>In Progress</span>
            </button>

            <button
              onClick={handleRevisionClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-all"
            >
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <span>Record Revision</span>
            </button>

            <button
              onClick={() => handleStatusToggle('out_of_syllabus')}
              className={'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ' + (status === 'out_of_syllabus' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-700')}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Out of Syllabus</span>
            </button>
          </div>
        )}

        {/* Revision Statistics Box */}
        <div className="grid grid-cols-2 gap-4 bg-zinc-50/80 p-4 rounded-2xl border border-zinc-100">
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
              Revisions Logged
            </div>
            <div className="text-xl font-bold text-zinc-900">
              {currentRev?.revisionCount || 0}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
              Last Revised
            </div>
            <div className="text-xs font-medium text-zinc-700 pt-1">
              {currentRev?.lastRevisedAt ? formatDate(currentRev.lastRevisedAt) : 'Not revised yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Notes Module */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-pink-500" />
            <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
              Personal Study Notes
            </h2>
          </div>
          <span className="text-[11px] text-zinc-400">
            {currentNote?.updatedAt ? 'Saved ' + formatDate(currentNote.updatedAt) : 'Auto-synced'}
          </span>
        </div>

        <textarea
          value={noteContent}
          onChange={e => setNoteContent(e.target.value)}
          disabled={isAdmin}
          placeholder={isAdmin ? 'No candidate notes recorded.' : 'Type your key summaries, mnemonics, or revision pointers here...'}
          rows={6}
          className="w-full text-xs sm:text-sm text-zinc-800 placeholder-zinc-400 border border-zinc-200 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 bg-zinc-50/30 transition-all resize-y disabled:bg-zinc-50"
        />

        {!isAdmin && (
          <div className="flex justify-end">
            <button
              onClick={handleSaveNotes}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Notes to Cloud'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
