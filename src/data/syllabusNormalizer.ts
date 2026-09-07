import type { RawSyllabusRecord, SyllabusNode } from '../types';

export function formatTitle(raw: string): string {
  if (!raw || raw === 'NA') return '';
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function makeNodeId(parts: string[]): string {
  return parts
    .filter(Boolean)
    .join('::')
    .toLowerCase()
    .replace(/[^a-z0-9:_]/g, '_');
}

function getHierarchyPath(record: RawSyllabusRecord): string[] {
  const levels = [
    record.level_1,
    record.level_2,
    record.level_3,
    record.level_4,
    record.level_5,
    record.level_6,
  ];
  return levels.filter((l): l is string => Boolean(l && l.trim() && l !== 'NA'));
}

export function normalizeSyllabus(records: RawSyllabusRecord[]): SyllabusNode[] {
  const stageNodes = new Map<string, SyllabusNode>();

  for (const record of records) {
    const stage = record.stage || 'General';
    const paper = record.paper || 'General';
    const subject = record.subject || 'General';
    const hierarchyPath = getHierarchyPath(record);

    const stageId = makeNodeId([stage]);
    if (!stageNodes.has(stageId)) {
      stageNodes.set(stageId, {
        id: stageId,
        title: stage,
        displayTitle: formatTitle(stage),
        stage,
        paper: '',
        subject: '',
        path: [stage],
        depth: 0,
        isLeaf: false,
        children: [],
        isStateSpecific: false,
        state: 'NA',
        createdBy: 'system',
      });
    }
    const stageNode = stageNodes.get(stageId)!;

    const paperId = makeNodeId([stage, paper]);
    let paperNode = stageNode.children.find(c => c.id === paperId);
    if (!paperNode) {
      paperNode = {
        id: paperId,
        title: paper,
        displayTitle: formatTitle(paper),
        stage,
        paper,
        subject: '',
        path: [stage, paper],
        depth: 1,
        isLeaf: false,
        children: [],
        isStateSpecific: false,
        state: 'NA',
        createdBy: 'system',
        parentId: stageNode.id,
      };
      stageNode.children.push(paperNode);
    }

    const subjectId = makeNodeId([stage, paper, subject]);
    let subjectNode = paperNode.children.find(c => c.id === subjectId);
    if (!subjectNode) {
      subjectNode = {
        id: subjectId,
        title: subject,
        displayTitle: formatTitle(subject),
        stage,
        paper,
        subject,
        path: [stage, paper, subject],
        depth: 2,
        isLeaf: false,
        children: [],
        isStateSpecific: false,
        state: 'NA',
        createdBy: 'system',
        parentId: paperNode.id,
      };
      paperNode.children.push(subjectNode);
    }

    let currentNode = subjectNode;
    if (hierarchyPath.length === 0) {
      const leafId = makeNodeId([stage, paper, subject, 'item_' + record.id]);
      let leafNode = currentNode.children.find(c => c.id === leafId);
      if (!leafNode) {
        leafNode = {
          id: leafId,
          originalId: record.id,
          title: subject,
          displayTitle: formatTitle(subject),
          stage,
          paper,
          subject,
          path: [stage, paper, subject],
          depth: 3,
          isLeaf: true,
          children: [],
          isStateSpecific: record.is_state_specific,
          state: record.state,
          createdBy: 'system',
          parentId: currentNode.id,
        };
        currentNode.children.push(leafNode);
      }
    } else {
      for (let i = 0; i < hierarchyPath.length; i++) {
        const levelTitle = hierarchyPath[i];
        const isLastLevel = i === hierarchyPath.length - 1;
        const currentPath = [stage, paper, subject, ...hierarchyPath.slice(0, i + 1)];
        const nodeId = makeNodeId(currentPath);

        let childNode = currentNode.children.find(c => c.id === nodeId);
        if (!childNode) {
          childNode = {
            id: nodeId,
            originalId: isLastLevel ? record.id : undefined,
            title: levelTitle,
            displayTitle: formatTitle(levelTitle),
            stage,
            paper,
            subject,
            path: currentPath,
            depth: 3 + i,
            isLeaf: isLastLevel,
            children: [],
            isStateSpecific: record.is_state_specific,
            state: record.state,
            createdBy: 'system',
            parentId: currentNode.id,
          };
          currentNode.children.push(childNode);
        } else if (isLastLevel && !childNode.isLeaf && childNode.children.length === 0) {
          childNode.isLeaf = true;
          childNode.originalId = record.id;
        }

        currentNode = childNode;
      }
    }
  }

  return Array.from(stageNodes.values());
}

export function flattenNodes(nodes: SyllabusNode[]): SyllabusNode[] {
  const result: SyllabusNode[] = [];
  function walk(node: SyllabusNode) {
    result.push(node);
    for (const child of node.children) {
      walk(child);
    }
  }
  for (const node of nodes) {
    walk(node);
  }
  return result;
}

export function findNodeById(nodes: SyllabusNode[], id: string): SyllabusNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}
