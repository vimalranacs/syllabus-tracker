import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyStore } from '../store/studyStore';
import { findNodeById } from '../data/syllabusNormalizer';
import { Breadcrumbs } from '../components/navigation/Breadcrumbs';
import { SyllabusExplorer } from '../components/syllabus/SyllabusExplorer';

export default function StagePage() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const { syllabusTree } = useStudyStore();

  const stageNode = useMemo(() => {
    if (!stageId) return null;
    return findNodeById(syllabusTree, stageId);
  }, [syllabusTree, stageId]);

  if (!stageNode) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-zinc-400">Exam stage not found.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-semibold text-pink-600 hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <Breadcrumbs items={[{ label: stageNode.displayTitle }]} />
      <SyllabusExplorer key={stageNode.id} root={stageNode} />
    </div>
  );
}
