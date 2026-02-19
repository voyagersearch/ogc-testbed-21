import { useState, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { Settings } from './components/Settings';
import { InterfaceToggle } from './components/InterfaceToggle';
import { ApiLandingPage } from './components/ApiLandingPage';
import { VoyagerInterface } from './components/VoyagerInterface';
import { STACBrowserInterface } from './components/STACBrowserInterface';
import { RecordsBrowserInterface } from './components/RecordsBrowserInterface';
import { searchVoyager, fetchFacets, buildQueryUrl, fetchDisplayTemplate } from './services/voyagerApi';
import { getBaseUrl, setBaseUrl, getDisplayTemplateId, setDisplayTemplateId, getTransformApiUrl, setTransformApiUrl, getStandardsApiUrl, setStandardsApiUrl } from './config';
import { transformVoyagerResponseToSTAC } from './services/stacTransform';
import { transformVoyagerToOGCRecord } from './services/recordsTransform';

interface AppState {
  interfaceMode: 'home' | 'voyager' | 'stac_browser' | 'ogc_records';
  searchQuery: string;
  selectedFacets: Record<string, string[]>;
  searchResults: any[];
  stacItems: any[];
  ogcRecords: any[];
  facetData: any;
  fullResponse: any;
  showFacetJson: boolean;
  showResultsJson: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  totalResults: number;
  baseUrl: string;
  displayTemplateId: string;
  transformApiUrl: string;
  standardsApiUrl: string;
  displayTemplate: any;
  currentStart: number;
}

function App() {
  const [state, setState] = useState<AppState>({
    interfaceMode: 'home',
    searchQuery: '',
    selectedFacets: {},
    searchResults: [],
    stacItems: [],
    ogcRecords: [],
    facetData: null,
    fullResponse: null,
    showFacetJson: false,
    showResultsJson: false,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    totalResults: 0,
    baseUrl: getBaseUrl(),
    displayTemplateId: getDisplayTemplateId(),
    transformApiUrl: getTransformApiUrl(),
    standardsApiUrl: getStandardsApiUrl(),
    displayTemplate: null,
    currentStart: 0,
  });

  useEffect(() => {
    loadInitialFacets();
  }, []);

  const handleInterfaceToggle = (mode: 'home' | 'voyager' | 'stac_browser' | 'ogc_records') => {
    setState(prev => ({ ...prev, interfaceMode: mode }));
  };

  const loadInitialFacets = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const displayTemplate = await fetchDisplayTemplate();

      const [facetResponse, searchResponse] = await Promise.all([
        fetchFacets('*:*', {}, displayTemplate),
        searchVoyager('*:*', {})
      ]);

      const { items: stacItems } = transformVoyagerResponseToSTAC(searchResponse, state.baseUrl);
      const ogcRecords = searchResponse.response.docs.map((doc: any) =>
        transformVoyagerToOGCRecord(doc, state.baseUrl)
      );

      setState(prev => ({
        ...prev,
        searchResults: searchResponse.response.docs,
        stacItems: stacItems,
        ogcRecords: ogcRecords,
        facetData: facetResponse.facets || facetResponse.facet_counts,
        fullResponse: searchResponse,
        totalResults: searchResponse.response.numFound,
        displayTemplate,
        isLoading: false,
        currentStart: 48,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load initial data',
        isLoading: false,
      }));
    }
  };

  const handleSearch = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [facetResponse, searchResponse] = await Promise.all([
        fetchFacets(state.searchQuery || '*:*', state.selectedFacets, state.displayTemplate),
        searchVoyager(state.searchQuery, state.selectedFacets)
      ]);

      const { items: stacItems } = transformVoyagerResponseToSTAC(searchResponse, state.baseUrl);
      const ogcRecords = searchResponse.response.docs.map((doc: any) =>
        transformVoyagerToOGCRecord(doc, state.baseUrl)
      );

      setState(prev => ({
        ...prev,
        searchResults: searchResponse.response.docs,
        stacItems: stacItems,
        ogcRecords: ogcRecords,
        facetData: facetResponse.facets || facetResponse.facet_counts,
        fullResponse: searchResponse,
        totalResults: searchResponse.response.numFound,
        isLoading: false,
        currentStart: 48,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Search failed',
        isLoading: false,
      }));
    }
  };

  const handleLoadMore = async () => {
    if (state.isLoadingMore || state.searchResults.length >= state.totalResults) {
      return;
    }

    setState(prev => ({ ...prev, isLoadingMore: true }));

    try {
      const searchResponse = await searchVoyager(
        state.searchQuery || '*:*',
        state.selectedFacets,
        state.currentStart,
        48
      );

      const { items: newStacItems } = transformVoyagerResponseToSTAC(searchResponse, state.baseUrl);
      const newOgcRecords = searchResponse.response.docs.map((doc: any) =>
        transformVoyagerToOGCRecord(doc, state.baseUrl)
      );

      setState(prev => ({
        ...prev,
        searchResults: [...prev.searchResults, ...searchResponse.response.docs],
        stacItems: [...prev.stacItems, ...newStacItems],
        ogcRecords: [...prev.ogcRecords, ...newOgcRecords],
        isLoadingMore: false,
        currentStart: prev.currentStart + 48,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load more results',
        isLoadingMore: false,
      }));
    }
  };

  const handleCopyUrl = () => {
    const url = buildQueryUrl(state.searchQuery, state.selectedFacets);
    navigator.clipboard.writeText(url);
  };

  const handleCopyJson = (type: 'results' | 'facets') => {
    const data = type === 'results'
      ? { response: state.fullResponse?.response, total: state.totalResults }
      : state.facetData;

    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const toggleJsonDisplay = (type: 'results' | 'facets') => {
    setState(prev => ({
      ...prev,
      showResultsJson: type === 'results' ? !prev.showResultsJson : prev.showResultsJson,
      showFacetJson: type === 'facets' ? !prev.showFacetJson : prev.showFacetJson,
    }));
  };

  const handleFacetChange = async (facetName: string, value: string, isSelected: boolean) => {
    setState(prev => {
      const currentValues = prev.selectedFacets[facetName] || [];
      const newValues = isSelected
        ? [...currentValues, value]
        : currentValues.filter(v => v !== value);

      const newSelectedFacets = {
        ...prev.selectedFacets,
        [facetName]: newValues,
      };

      if (newValues.length === 0) {
        delete newSelectedFacets[facetName];
      }

      return {
        ...prev,
        selectedFacets: newSelectedFacets,
        isLoading: true,
        error: null,
      };
    });

    try {
      const currentValues = state.selectedFacets[facetName] || [];
      const newValues = isSelected
        ? [...currentValues, value]
        : currentValues.filter(v => v !== value);

      const newSelectedFacets = {
        ...state.selectedFacets,
        [facetName]: newValues,
      };

      if (newValues.length === 0) {
        delete newSelectedFacets[facetName];
      }

      const [facetResponse, searchResponse] = await Promise.all([
        fetchFacets(state.searchQuery || '*:*', newSelectedFacets, state.displayTemplate),
        searchVoyager(state.searchQuery, newSelectedFacets)
      ]);

      const { items: stacItems } = transformVoyagerResponseToSTAC(searchResponse, state.baseUrl);
      const ogcRecords = searchResponse.response.docs.map((doc: any) =>
        transformVoyagerToOGCRecord(doc, state.baseUrl)
      );

      setState(prev => ({
        ...prev,
        searchResults: searchResponse.response.docs,
        stacItems: stacItems,
        ogcRecords: ogcRecords,
        facetData: facetResponse.facets || facetResponse.facet_counts,
        fullResponse: searchResponse,
        totalResults: searchResponse.response.numFound,
        isLoading: false,
        currentStart: 48,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Search failed',
        isLoading: false,
      }));
    }
  };

  return (
    <div className="h-screen bg-[#F5F2ED] flex flex-col">
      <header className="bg-white border-b border-[#E5DDD2] px-6 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-[#6B605A]">Voyager Search</h1>
            <div className="flex items-center gap-4">
              <InterfaceToggle
                mode={state.interfaceMode}
                onToggle={handleInterfaceToggle}
              />
              <Settings
                baseUrl={state.baseUrl}
                displayTemplateId={state.displayTemplateId}
                transformApiUrl={state.transformApiUrl}
                standardsApiUrl={state.standardsApiUrl}
                onBaseUrlChange={(url) => {
                  setBaseUrl(url);
                  setState(prev => ({ ...prev, baseUrl: url }));
                  loadInitialFacets();
                }}
                onDisplayTemplateIdChange={(id) => {
                  setDisplayTemplateId(id);
                  setState(prev => ({ ...prev, displayTemplateId: id }));
                  loadInitialFacets();
                }}
                onTransformApiUrlChange={(url) => {
                  setTransformApiUrl(url);
                  setState(prev => ({ ...prev, transformApiUrl: url }));
                }}
                onStandardsApiUrlChange={(url) => {
                  setStandardsApiUrl(url);
                  setState(prev => ({ ...prev, standardsApiUrl: url }));
                }}
              />
            </div>
          </div>
          <SearchBar
            query={state.searchQuery}
            onQueryChange={(query) => setState(prev => ({ ...prev, searchQuery: query }))}
            onSearch={handleSearch}
            onCopyUrl={handleCopyUrl}
            isLoading={state.isLoading}
          />
        </div>
      </header>

      {state.interfaceMode === 'home' ? (
        <ApiLandingPage
          voyagerApiUrl={`${state.baseUrl}api/rest`}
          stacApiUrl="/api/stac-api"
          recordsApiUrl="/api/ogc-records-api"
        />
      ) : state.interfaceMode === 'voyager' ? (
        <VoyagerInterface
          searchResults={state.searchResults}
          facetData={state.facetData}
          selectedFacets={state.selectedFacets}
          totalResults={state.totalResults}
          isLoading={state.isLoading}
          isLoadingMore={state.isLoadingMore}
          error={state.error}
          searchQuery={state.searchQuery}
          showFacetJson={state.showFacetJson}
          showResultsJson={state.showResultsJson}
          fullResponse={state.fullResponse}
          transformApiUrl={state.transformApiUrl}
          baseUrl={state.baseUrl}
          onFacetChange={handleFacetChange}
          onToggleJsonDisplay={toggleJsonDisplay}
          onCopyJson={handleCopyJson}
          onLoadMore={handleLoadMore}
        />
      ) : state.interfaceMode === 'stac_browser' ? (
        <STACBrowserInterface
          stacItems={state.stacItems}
          ogcRecords={state.ogcRecords}
          totalResults={state.totalResults}
          isLoading={state.isLoading}
          isLoadingMore={state.isLoadingMore}
          error={state.error}
          baseUrl={state.baseUrl}
          stacApiUrl="/api/stac-api"
          recordsApiUrl="/api/ogc-records-api"
          onLoadMore={handleLoadMore}
        />
      ) : (
        <RecordsBrowserInterface
          searchResults={state.ogcRecords}
          facetData={state.facetData}
          selectedFacets={state.selectedFacets}
          totalResults={state.totalResults}
          isLoading={state.isLoading}
          isLoadingMore={state.isLoadingMore}
          error={state.error}
          searchQuery={state.searchQuery}
          showFacetJson={state.showFacetJson}
          showResultsJson={state.showResultsJson}
          fullResponse={state.fullResponse}
          recordsApiUrl="/api/ogc-records-api"
          onFacetChange={handleFacetChange}
          onToggleJsonDisplay={toggleJsonDisplay}
          onCopyJson={handleCopyJson}
          onLoadMore={handleLoadMore}
        />
      )}
    </div>
  );
}

export default App;
