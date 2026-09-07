import type { ItemStatus } from '../../types';

interface StatusIconProps {
  status: ItemStatus;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function StatusIcon({ status, size = 'md', interactive = false, onClick }: StatusIconProps) {
  const sizes = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-7 h-7 text-base',
  };

  const configs = {
    not_started: {
      label: '○',
      className: 'border-2 border-zinc-300 text-zinc-400 bg-white hover:border-pink-300',
      title: 'Not Started (Click to complete)'
    },
    in_progress: {
      label: '◐',
      className: 'border-2 border-amber-400 text-amber-500 bg-amber-50',
      title: 'In Progress'
    },
    completed: {
      label: '✓',
      className: 'bg-pink-500 border-2 border-pink-500 text-white shadow-sm',
      title: 'Completed (Click to uncheck)'
    },
    out_of_syllabus: {
      label: '⊘',
      className: 'border-2 border-zinc-200 text-zinc-400 bg-zinc-100',
      title: 'Out of Syllabus'
    },
  };

  const config = configs[status] || configs.not_started;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      title={config.title}
      aria-label={config.title}
      className={'${sizes[size]} rounded-full flex items-center justify-center flex-shrink-0 font-medium transition-all'}
    >
      <span className="leading-none select-none">{config.label}</span>
    </button>
  );
}
