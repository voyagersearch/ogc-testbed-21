import { Search, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onCopyUrl: () => void;
  isLoading: boolean;
}

export function SearchBar({ query, onQueryChange, onSearch, onCopyUrl, isLoading }: SearchBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyUrl();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Enter search query..."
          className="w-full px-4 py-2 pl-10 border border-[#E5DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B9B8D] focus:border-transparent bg-white text-[#6B605A]"
        />
        <Search className="absolute left-3 top-2.5 w-5 h-5 text-[#A39A91]" />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="px-6 py-2 bg-[#8B9B8D] text-white rounded-lg hover:bg-[#7A8A7D] disabled:bg-[#BCC7BE] disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching...
          </>
        ) : (
          'Search'
        )}
      </button>

      <button
        type="button"
        onClick={handleCopy}
        className="px-4 py-2 border border-[#E5DDD2] rounded-lg hover:bg-[#F9F7F4] flex items-center gap-2 bg-white text-[#6B605A]"
        title="Copy query URL to clipboard"
      >
        <Copy className="w-4 h-4" />
        {copied ? 'Copied!' : 'Copy URL'}
      </button>
    </form>
  );
}
