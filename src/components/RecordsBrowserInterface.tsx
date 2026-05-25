import { useRef, useEffect, useState } from 'react';
import { RecordCard } from './RecordCard';
import { Facets } from './Facets';

interface RecordsBrowserInterfaceProps {
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
  recordsApiUrl: string;
  onFacetChange: (facetName: string, value: string, isSelected: boolean) => void;
  onToggleJsonDisplay: (type: 'results' | 'facets') => void;
  onCopyJson: (type: 'results' | 'facets') => void;
  onLoadMore: () => void;
}

export function RecordsBrowserInterface({
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
  recordsApiUrl,
  onFacetChange,
  onToggleJsonDisplay,
  onCopyJson,
  onLoadMore
}: RecordsBrowserInterfaceProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [displayMode, setDisplayMode] = useState<'none' | 'records' | 'html'>('none');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [recordsApiResponse, setRecordsApiResponse] = useState<any>(null);
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);

  const handleResultClick = (result: any) => {
    setSelectedResult((prev) => (prev?.id === result.id ? null : result));
  };

  useEffect(() => {
    if (displayMode === 'records' && !recordsApiResponse && searchResults.length > 0) {
      const collection = {
        type: 'FeatureCollection',
        features: searchResults,
        links: [
          {
            href: `${recordsApiUrl}/collections/records/items`,
            rel: 'self',
            type: 'application/geo+json',
            title: 'This document'
          },
          {
            href: `${recordsApiUrl}/collections/records`,
            rel: 'collection',
            type: 'application/json',
            title: 'The collection'
          }
        ],
        timeStamp: new Date().toISOString(),
        numberMatched: totalResults,
        numberReturned: searchResults.length
      };
      setRecordsApiResponse(collection);
    }
  }, [displayMode, recordsApiResponse, searchResults, recordsApiUrl, totalResults]);

  useEffect(() => {
    if (displayMode === 'html' && !htmlContent) {
      setIsLoadingHtml(true);
      fetch(recordsApiUrl, {
        headers: {
          'Accept': 'text/html',
        }
      })
        .then(response => response.text())
        .then(html => {
          setHtmlContent(html);
          setIsLoadingHtml(false);
        })
        .catch(err => {
          console.error('Error fetching HTML:', err);
          setIsLoadingHtml(false);
        });
    }
  }, [displayMode, recordsApiUrl, htmlContent]);

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
      <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">OGC API - Records</h2>
          <p className="text-xs text-gray-600 mt-1">Standards-compliant geospatial records</p>
        </div>

        <Facets
          facetData={facetData}
          selectedFacets={selectedFacets}
          onFacetChange={onFacetChange}
        />

        <div className="border-t border-gray-200 p-4 mt-auto">
          <button
            onClick={() => onToggleJsonDisplay('facets')}
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 mb-2"
          >
            {showFacetJson ? 'Hide' : 'Show'} Facet JSON
          </button>
          {showFacetJson && (
            <div className="mt-2">
              <button
                onClick={() => onCopyJson('facets')}
                className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Copy Facet JSON
              </button>
              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-60 border border-gray-200">
                {JSON.stringify(facetData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-7xl mx-auto p-6 w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Records Collection</h2>
              <p className="text-sm text-gray-600">OGC API - Records compliant metadata</p>
            </div>
            <div className="flex gap-2">
              <a
                href={recordsApiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Landing
              </a>
              <a
                href={`${recordsApiUrl}/collections`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Collections
              </a>
              <a
                href={`${recordsApiUrl}/collections/records/items${searchQuery && searchQuery !== '*:*' ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Items
              </a>
              <a
                href={`${recordsApiUrl}/conformance`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Conformance
              </a>
              <button
                onClick={() => setDisplayMode(displayMode === 'records' ? 'none' : 'records')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {displayMode === 'records' ? 'Hide' : 'Show'} Records
              </button>
              <button
                onClick={() => setDisplayMode(displayMode === 'html' ? 'none' : 'html')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {displayMode === 'html' ? 'Hide' : 'Show'} HTML
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {displayMode !== 'none' && (
            <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
              {displayMode === 'records' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">OGC Records API Response</h3>
                    {recordsApiResponse && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(recordsApiResponse, null, 2));
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Copy JSON
                      </button>
                    )}
                  </div>
                  {recordsApiResponse ? (
                    <pre className="p-4 bg-gray-50 rounded text-xs overflow-auto max-h-96 border border-gray-200">
                      {JSON.stringify(recordsApiResponse, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-sm text-gray-500">No records available</div>
                  )}
                </div>
              )}
              {displayMode === 'html' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">HTML Representation</h3>
                    {htmlContent && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(htmlContent);
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Copy HTML
                      </button>
                    )}
                  </div>
                  {isLoadingHtml ? (
                    <div className="text-sm text-gray-500">Loading HTML...</div>
                  ) : htmlContent ? (
                    <pre className="p-4 bg-gray-50 rounded text-xs overflow-auto max-h-96 border border-gray-200">
                      {htmlContent}
                    </pre>
                  ) : (
                    <div className="text-sm text-gray-500">No HTML content available</div>
                  )}
                </div>
              )}
            </div>
          )}

          {!isLoading && searchResults.length > 0 && (
            <div className="text-sm text-gray-600 mb-4 bg-white border border-gray-200 rounded-lg px-4 py-2">
              {searchResults.length} of {totalResults.toLocaleString()} results
            </div>
          )}
        </div>

        <div ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 pb-6">
            {isLoading ? (
              <div className="text-gray-500">Loading records...</div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {searchResults.map((result, index) => (
                    <RecordCard
                      key={result.id || index}
                      record={result}
                      isSelected={selectedResult?.id === result.id}
                      onClick={() => handleResultClick(result)}
                    />
                  ))}
                </div>
                {isLoadingMore && (
                  <div className="mt-8 text-center text-gray-500">
                    Loading more records...
                  </div>
                )}
                {!isLoadingMore && searchResults.length >= totalResults && searchResults.length > 0 && (
                  <div className="mt-8 text-center text-gray-500">
                    All records loaded
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">
                {searchQuery ? 'No records found' : 'Loading initial data...'}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
