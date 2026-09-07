import { useState, useMemo } from 'react';
import { useStudyStore } from '../store/studyStore';
import { toast } from 'react-hot-toast';
import { Modal } from '../components/ui/Modal';
import { Plus, RotateCcw, Trash2, Ban, Tag, Sparkles } from 'lucide-react';
import type { Priority } from '../types';

export default function ManageSyllabus() {
  const {
    syllabusFlat,
    progress,
    overrides,
    customTopics,
    getDisplayTitle,
    updateItemStatus,
    restoreItemName,
    addCustomTopic,
    deleteCustomTopic
  } = useStudyStore();

  const [activeTab, setActiveTab] = useState<'excluded' | 'custom' | 'renamed'>('excluded');
  const [modalOpen, setModalOpen] = useState(false);
  const [newTopic, setNewTopic] = useState({
    title: '',
    subject: 'General Studies',
    priority: 'medium' as Priority
  });

  const excludedItems = useMemo(() => {
    return syllabusFlat.filter(n => progress[n.id]?.status === 'out_of_syllabus');
  }, [syllabusFlat, progress]);

  const renamedList = useMemo(() => {
    return Object.values(overrides);
  }, [overrides]);

  const handleRestore = async (id: string, title: string) => {
    await updateItemStatus(id, 'not_started', title);
    toast.success('Topic restored to active syllabus');
  };

  const handleCreateCustom = async () => {
    if (!newTopic.title.trim()) {
      toast.error('Title is required');
      return;
    }
    await addCustomTopic({
      title: newTopic.title.trim(),
      parentId: 'custom_root',
      stage: 'General',
      paper: 'Self-Study',
      subject: newTopic.subject,
      path: ['Custom Additions', newTopic.subject],
      priority: newTopic.priority,
    });
    toast.success('Custom topic added');
    setModalOpen(false);
    setNewTopic({ title: '', subject: 'General Studies', priority: 'medium' });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            Manage Curriculum
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Audit excluded sections, add custom notes/topics, and manage customizations
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Topic</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 rounded-2xl">
        <button
          onClick={() => setActiveTab('excluded')}
          className={'flex-1 py-2 rounded-xl text-xs font-semibold transition-all ' + (activeTab === 'excluded' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800')}
        >
          Excluded ({excludedItems.length})
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={'flex-1 py-2 rounded-xl text-xs font-semibold transition-all ' + (activeTab === 'custom' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800')}
        >
          Custom Topics ({customTopics.length})
        </button>
        <button
          onClick={() => setActiveTab('renamed')}
          className={'flex-1 py-2 rounded-xl text-xs font-semibold transition-all ' + (activeTab === 'renamed' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800')}
        >
          Renamed ({renamedList.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-xs">
        {activeTab === 'excluded' && (
          excludedItems.length === 0 ? (
            <div className="py-14 text-center text-xs text-zinc-400 space-y-2">
              <Ban className="w-6 h-6 text-zinc-300 mx-auto" />
              <p>No topics currently marked as out of syllabus.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {excludedItems.map(node => (
                <div key={node.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-zinc-700 line-through truncate">
                      {getDisplayTitle(node)}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                      {node.path.slice(0, 3).map(p => p.replace(/_/g, ' ')).join(' › ')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(node.id, node.displayTitle)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'custom' && (
          customTopics.length === 0 ? (
            <div className="py-14 text-center text-xs text-zinc-400 space-y-2">
              <Sparkles className="w-6 h-6 text-zinc-300 mx-auto" />
              <p>No personal topics created yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {customTopics.map(t => (
                <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-zinc-800 truncate">{t.title}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {t.subject} · {t.priority} priority
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await deleteCustomTopic(t.id);
                      toast.success('Custom topic removed');
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'renamed' && (
          renamedList.length === 0 ? (
            <div className="py-14 text-center text-xs text-zinc-400 space-y-2">
              <Tag className="w-6 h-6 text-zinc-300 mx-auto" />
              <p>No topic title overrides active.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {renamedList.map(o => (
                <div key={o.itemId} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-zinc-800 truncate">{o.newTitle}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Original: {o.originalTitle}</div>
                  </div>
                  <button
                    onClick={async () => {
                      await restoreItemName(o.itemId);
                      toast.success('Original name restored');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal to add custom topic */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Custom Study Topic">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Topic Name *
            </label>
            <input
              type="text"
              value={newTopic.title}
              onChange={e => setNewTopic({ ...newTopic, title: e.target.value })}
              placeholder="e.g. Special UP Schemes & Budget 2026"
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Subject Area
            </label>
            <input
              type="text"
              value={newTopic.subject}
              onChange={e => setNewTopic({ ...newTopic, subject: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Study Priority
            </label>
            <select
              value={newTopic.priority}
              onChange={e => setNewTopic({ ...newTopic, priority: e.target.value as Priority })}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCustom}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-pink-500 text-white hover:bg-pink-600"
            >
              Save Topic
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
