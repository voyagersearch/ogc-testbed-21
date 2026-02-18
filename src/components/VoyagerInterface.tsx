import { useRef, useEffect, useState } from 'react';
import { ResultCard } from './ResultCard';
import { Facets } from './Facets';

interface VoyagerInterfaceProps {
  searchResults: any[];
  facetData: any;
  selectedFacets: Record<string, string[]>;
  totalResults: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  searchQuery: string;
  showFacetJson: boolean;
  showResultsJson: boolean;
  fullResponse: any;
  transformApiUrl?: string;
  baseUrl: string;
  onFacetChange: (facetName: string, value: string, isSelected: boolean) => void;
  onToggleJsonDisplay: (type: 'results' | 'facets') => void;
  onCopyJson: (type: 'results' | 'facets') => void;
  onLoadMore: () => void;
}

export function VoyagerInterface({
  searchResults,
  facetData,
  selectedFacets,
  totalResults,
  isLoading,
  isLoadingMore,
  error,
  searchQuery,
  showFacetJson,
  showResultsJson,
  fullResponse,
  transformApiUrl,
  baseUrl,
  onFacetChange,
  onToggleJsonDisplay,
  onCopyJson,
  onLoadMore
}: VoyagerInterfaceProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  const handleResultClick = (result: any) => {
    setSelectedResult((prev) => (prev?.id === result.id ? null : result));
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!mainRef.current || isLoading || isLoadingMore) return;

      const { scrollTop, scrollHeight, clientHeight } = mainRef.current;
      const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 200;

      if (scrolledToBottom && searchResults.length < totalResults) {
        onLoadMore();
      }
    };

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
      return () => mainElement.removeEventListener('scroll', handleScroll);
    }
  }, [isLoading, isLoadingMore, searchResults.length, totalResults, onLoadMore]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-80 bg-white border-r border-[#E5DDD2] overflow-y-auto flex flex-col">
        <Facets
          facetData={facetData}
          selectedFacets={selectedFacets}
          onFacetChange={onFacetChange}
        />

        <div className="border-t border-[#E5DDD2] p-4 mt-auto">
          <button
            onClick={() => onToggleJsonDisplay('facets')}
            className="w-full px-4 py-2 text-sm border border-[#E5DDD2] rounded-lg hover:bg-[#F9F7F4] mb-2 bg-white text-[#6B605A]"
          >
            {showFacetJson ? 'Hide' : 'Show'} Facet JSON
          </button>
          {showFacetJson && (
            <div className="mt-2">
              <button
                onClick={() => onCopyJson('facets')}
                className="w-full px-4 py-2 text-sm bg-[#8B9B8D] text-white rounded-lg hover:bg-[#7A8A7D]"
              >
                Copy Facet JSON
              </button>
              <pre className="mt-2 p-2 bg-[#F9F7F4] rounded text-xs overflow-auto max-h-60 border border-[#E5DDD2] text-[#6B605A]">
                {JSON.stringify(facetData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-7xl mx-auto p-6 w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#6B605A]">Search Results</h2>
            <div className="flex gap-2">
              <button
                onClick={() => onToggleJsonDisplay('results')}
                className="px-4 py-2 text-sm border border-[#E5DDD2] rounded-lg hover:bg-[#F9F7F4] bg-white text-[#6B605A]"
              >
                {showResultsJson ? 'Hide' : 'Show'} JSON
              </button>
              {showResultsJson && (
                <button
                  onClick={() => onCopyJson('results')}
                  className="px-4 py-2 text-sm bg-[#8B9B8D] text-white rounded-lg hover:bg-[#7A8A7D]"
                >
                  Copy JSON
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-[#FAEBEB] border border-[#E5C7C7] text-[#A35555] px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {showResultsJson && fullResponse && (
            <div className="mb-4">
              <pre className="p-4 bg-[#F9F7F4] rounded text-xs overflow-auto max-h-96 border border-[#E5DDD2] text-[#6B605A]">
                {JSON.stringify({ response: fullResponse.response, total: totalResults }, null, 2)}
              </pre>
            </div>
          )}

          {!isLoading && searchResults.length > 0 && (
            <div className="text-sm text-[#7A6F65] mb-4 bg-white border border-[#E5DDD2] rounded-lg px-4 py-2">
              {searchResults.length} of {totalResults.toLocaleString()} results
            </div>
          )}
        </div>

        <div ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 pb-6">
            {isLoading ? (
              <div className="text-[#A39A91]">Loading results...</div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {searchResults.map((result, index) => (
                    <ResultCard
                      key={result.id || index}
                      result={result}
                      isSelected={selectedResult?.id === result.id}
                      onClick={() => handleResultClick(result)}
                      transformApiUrl={transformApiUrl}
                      baseUrl={baseUrl}
                    />
                  ))}
                </div>
                {isLoadingMore && (
                  <div className="mt-8 text-center text-[#A39A91]">
                    Loading more results...
                  </div>
                )}
                {!isLoadingMore && searchResults.length >= totalResults && searchResults.length > 0 && (
                  <div className="mt-8 text-center text-[#A39A91]">
                    All results loaded
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-[#A39A91]">
                {searchQuery ? 'No results found' : 'Loading initial data...'}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
