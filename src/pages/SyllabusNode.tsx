import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudyStore } from '../store/studyStore';
import { findNodeById } from '../data/syllabusNormalizer';
import { Breadcrumbs } from '../components/navigation/Breadcrumbs';
import { SyllabusExplorer } from '../components/syllabus/SyllabusExplorer';

export default function SyllabusNodePage() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const { syllabusTree } = useStudyStore();

  // Scroll only when the focused root changes — never on expand/collapse.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [nodeId]);

  const node = useMemo(() => {
    if (!nodeId) return null;
    return findNodeById(syllabusTree, nodeId);
  }, [syllabusTree, nodeId]);

  const breadcrumbItems = useMemo(() => {
    if (!node) return [];
    return node.path.map(segment => ({
      label: segment.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    }));
  }, [node]);

  if (!node) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm text-zinc-400">Section or topic not found.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-semibold text-pink-600 hover:underline"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Single leaf → detail view.
  if (node.isLeaf && node.children.length === 0) {
    navigate('/topic/' + node.id, { replace: true });
    return null;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <Breadcrumbs items={breadcrumbItems} />
      <SyllabusExplorer key={node.id} root={node} />
    </div>
  );
}
