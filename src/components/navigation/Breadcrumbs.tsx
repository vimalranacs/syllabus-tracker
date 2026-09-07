import { Home, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface Crumb {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-1.5 text-xs text-zinc-400 flex-wrap mb-4">
      <button
        onClick={() => navigate('/dashboard')}
        className="p-1 hover:text-pink-600 transition-colors flex items-center gap-1 rounded hover:bg-zinc-100"
        title="Dashboard"
      >
        <Home className="w-3.5 h-3.5" />
      </button>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <div key={idx} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-zinc-300" />
            {isLast || !item.path ? (
              <span className="text-zinc-800 font-medium max-w-[200px] truncate" title={item.label}>
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => navigate(item.path!)}
                className="hover:text-pink-600 transition-colors max-w-[150px] truncate"
                title={item.label}
              >
                {item.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
