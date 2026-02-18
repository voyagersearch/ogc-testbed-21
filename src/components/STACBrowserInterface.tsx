import { useState, useRef, useEffect } from 'react';
import { STACMap } from './STACMap';
import { STACItemCard } from './STACItemCard';
import { STACMetadataPanel } from './STACMetadataPanel';
import { Layers, Grid3x3 } from 'lucide-react';

interface STACBrowserInterfaceProps {
  stacItems: any[];
  ogcRecords: any[];
  totalResults: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  baseUrl: string;
  stacApiUrl: string;
  recordsApiUrl: string;
  onLoadMore: () => void;
}

export function STACBrowserInterface({
  stacItems,
  ogcRecords,
  totalResults,
  isLoading,
  isLoadingMore,
  error,
  baseUrl,
  stacApiUrl,
  recordsApiUrl,
  onLoadMore
}: STACBrowserInterfaceProps) {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'grid'>('split');
  const [showSTAC, setShowSTAC] = useState(false);
  const [stacApiResponse, setStacApiResponse] = useState<any>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const gridRef = useRef<HTMLDivElement>(null);

  const spatialItems = stacItems.filter(item =>
    item.geometry && item.bbox && Array.isArray(item.bbox) && item.bbox.length >= 4
  );

  const handleItemSelect = (item: any) => {
    console.log('Selected item:', item.id, item.properties?.title);
    setSelectedItem(item);
  };

  useEffect(() => {
    if (selectedItem?.id && cardRefs.current[selectedItem.id]) {
      cardRefs.current[selectedItem.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [selectedItem]);

  useEffect(() => {
    if (showSTAC && !stacApiResponse && stacItems.length > 0) {
      const collection = {
        type: 'FeatureCollection',
        stac_version: '1.0.0',
        stac_extensions: [],
        features: stacItems,
        links: [
          {
            rel: 'self',
            href: `${stacApiUrl}/search`,
            type: 'application/geo+json'
          },
          {
            rel: 'root',
            href: stacApiUrl,
            type: 'application/json'
          }
        ],
        context: {
          returned: stacItems.length,
          limit: stacItems.length,
          matched: totalResults
        }
      };
      setStacApiResponse(collection);
    }
  }, [showSTAC, stacApiResponse, stacItems, stacApiUrl, totalResults]);

  useEffect(() => {
    const handleScroll = () => {
      if (!gridRef.current || isLoading || isLoadingMore) return;

      const { scrollTop, scrollHeight, clientHeight } = gridRef.current;
      const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 200;

      if (scrolledToBottom && spatialItems.length < totalResults) {
        onLoadMore();
      }
    };

    const gridElement = gridRef.current;
    if (gridElement) {
      gridElement.addEventListener('scroll', handleScroll);
      return () => gridElement.removeEventListener('scroll', handleScroll);
    }
  }, [isLoading, isLoadingMore, spatialItems.length, totalResults, onLoadMore]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-green-600" />
              STAC Browser
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'split'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'map'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Map Only
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
                viewMode === 'grid'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              Grid Only
            </button>

            <div className="h-6 w-px bg-gray-300 mx-2"></div>

            <a
              href={`${stacApiUrl}/conformance`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Conformance
            </a>
            <button
              onClick={() => setShowSTAC(!showSTAC)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              {showSTAC ? 'Hide' : 'Show'} STAC
            </button>
          </div>
        </div>

        {showSTAC && (
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">STAC API Response</h3>
              {stacApiResponse && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(stacApiResponse, null, 2));
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Copy JSON
                </button>
              )}
            </div>
            {stacApiResponse ? (
              <pre className="p-4 bg-gray-50 rounded text-xs overflow-auto max-h-96 border border-gray-200">
                {JSON.stringify(stacApiResponse, null, 2)}
              </pre>
            ) : (
              <div className="text-sm text-gray-500">No STAC items available</div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {!isLoading && (
            <div className="bg-white border-b border-gray-200 px-6 py-2">
              <span className="text-sm text-gray-600">
                {spatialItems.length} of {totalResults} results
              </span>
            </div>
          )}

          <div className="flex-1 flex overflow-hidden">
            {(viewMode === 'split' || viewMode === 'map') && (
              <div
                className={`${
                  viewMode === 'split' ? 'w-1/2' : 'flex-1'
                } border-r border-gray-200`}
              >
                {isLoading ? (
                  <div className="h-full flex items-center justify-center bg-gray-50">
                    <div className="text-gray-500">Loading map...</div>
                  </div>
                ) : spatialItems.length > 0 ? (
                  <STACMap
                    items={spatialItems}
                    selectedItem={selectedItem}
                    onItemSelect={handleItemSelect}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50">
                    <div className="text-gray-500">No spatial items to display on map</div>
                  </div>
                )}
              </div>
            )}

            {(viewMode === 'split' || viewMode === 'grid') && (
              <div ref={gridRef} className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} overflow-y-auto bg-gray-50`}>
              {isLoading ? (
                <div className="p-6 text-gray-500">Loading items...</div>
              ) : spatialItems.length > 0 ? (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {spatialItems.map((item, index) => (
                      <div
                        key={item.id || `item-${index}`}
                        ref={(el) => {
                          if (item.id) {
                            cardRefs.current[item.id] = el;
                          }
                        }}
                      >
                        <STACItemCard
                          item={item}
                          isSelected={selectedItem?.id === item.id}
                          onClick={() => handleItemSelect(item)}
                          baseUrl={baseUrl}
                        />
                      </div>
                    ))}
                  </div>
                  {isLoadingMore && (
                    <div className="mt-8 text-center text-gray-500">
                      Loading more items...
                    </div>
                  )}
                  {!isLoadingMore && spatialItems.length < totalResults && (
                    <div className="mt-8 text-center text-gray-500">
                      Scroll for more
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-gray-500">No spatial items found</div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="w-96 flex-shrink-0">
          <STACMetadataPanel
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        </div>
      )}
    </div>
  );
}
