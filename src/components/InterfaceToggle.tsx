import { Map, Grid2x2 as Grid, FileText, Home } from 'lucide-react';

interface InterfaceToggleProps {
  mode: 'home' | 'voyager' | 'stac_browser' | 'ogc_records';
  onToggle: (mode: 'home' | 'voyager' | 'stac_browser' | 'ogc_records') => void;
}

export function InterfaceToggle({ mode, onToggle }: InterfaceToggleProps) {
  return (
    <div className="inline-flex items-center bg-[#F5F2ED] rounded-lg p-1">
      <button
        onClick={() => onToggle('home')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${mode === 'home'
            ? 'bg-white text-[#6B605A] shadow-sm'
            : 'text-[#8A7F75] hover:text-[#6B605A]'
          }
        `}
      >
        <Home className="w-4 h-4" />
        Home
      </button>
      <button
        onClick={() => onToggle('voyager')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${mode === 'voyager'
            ? 'bg-white text-[#6B605A] shadow-sm'
            : 'text-[#8A7F75] hover:text-[#6B605A]'
          }
        `}
      >
        <Grid className="w-4 h-4" />
        Voyager
      </button>
      <button
        onClick={() => onToggle('stac_browser')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${mode === 'stac_browser'
            ? 'bg-white text-[#6B605A] shadow-sm'
            : 'text-[#8A7F75] hover:text-[#6B605A]'
          }
        `}
      >
        <Map className="w-4 h-4" />
        STAC Browser
      </button>
      <button
        onClick={() => onToggle('ogc_records')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${mode === 'ogc_records'
            ? 'bg-white text-[#6B605A] shadow-sm'
            : 'text-[#8A7F75] hover:text-[#6B605A]'
          }
        `}
      >
        <FileText className="w-4 h-4" />
        OGC API - Records
      </button>
    </div>
  );
}
