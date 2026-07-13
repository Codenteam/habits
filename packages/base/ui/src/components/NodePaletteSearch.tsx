import { Search } from 'lucide-react';

interface NodePaletteSearchProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

export default function NodePaletteSearch({
  value,
  onChange,
  placeholder = 'Search nodes...',
}: NodePaletteSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
