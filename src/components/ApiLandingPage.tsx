import { Server, Database, Map, FileText, ExternalLink } from 'lucide-react';

interface ApiLandingPageProps {
  voyagerApiUrl: string;
  stacApiUrl: string;
  recordsApiUrl: string;
}

export function ApiLandingPage({ voyagerApiUrl, stacApiUrl, recordsApiUrl }: ApiLandingPageProps) {
  const apis = [
    {
      name: 'Voyager API',
      icon: Server,
      description: 'Native Voyager search API with faceted navigation and full-text search capabilities',
      color: 'blue',
      endpoints: [
        { path: '/api/rest/display/displaytemplate', label: 'Display Template' },
        { path: '/api/rest/search', label: 'Search Endpoint' },
        { path: '/api/rest/display/facets', label: 'Facets Endpoint' }
      ],
      baseUrl: voyagerApiUrl
    },
    {
      name: 'STAC API',
      icon: Map,
      description: 'Spatial Temporal Asset Catalog API for geospatial data discovery and metadata',
      color: 'green',
      endpoints: [
        { path: '/collections', label: 'Collections' },
        { path: '/collections/voyager/items', label: 'Items' },
        { path: '/conformance', label: 'Conformance' }
      ],
      baseUrl: stacApiUrl
    },
    {
      name: 'OGC API - Records',
      icon: FileText,
      description: 'Standards-compliant geospatial records API supporting both spatial and non-spatial items',
      color: 'purple',
      endpoints: [
        { path: '/collections', label: 'Collections' },
        { path: '/collections/records/items', label: 'Items' },
        { path: '/conformance', label: 'Conformance' }
      ],
      baseUrl: recordsApiUrl
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-[#F9F7F4]',
          border: 'border-[#E5DDD2]',
          icon: 'text-[#8B9B8D]',
          title: 'text-[#6B605A]',
          link: 'text-[#8B9B8D] hover:text-[#7A8A7D]'
        };
      case 'green':
        return {
          bg: 'bg-[#F9F7F4]',
          border: 'border-[#D4CFC6]',
          icon: 'text-[#8B9B8D]',
          title: 'text-[#6B605A]',
          link: 'text-[#8B9B8D] hover:text-[#7A8A7D]'
        };
      case 'purple':
        return {
          bg: 'bg-[#F9F7F4]',
          border: 'border-[#E5DDD2]',
          icon: 'text-[#A39A91]',
          title: 'text-[#6B605A]',
          link: 'text-[#A39A91] hover:text-[#8A7F75]'
        };
      default:
        return {
          bg: 'bg-[#F9F7F4]',
          border: 'border-[#E5DDD2]',
          icon: 'text-[#A39A91]',
          title: 'text-[#6B605A]',
          link: 'text-[#A39A91] hover:text-[#8A7F75]'
        };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F2ED]">
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-[#7A6F65]" />
            <h1 className="text-3xl font-bold text-[#6B605A]">API Endpoints</h1>
          </div>
          <p className="text-[#8A7F75]">
            Access geospatial data through multiple standardized APIs. Each API provides different capabilities and formats for data discovery and access.
          </p>
        </div>

        <div className="grid gap-6">
          {apis.map((api) => {
            const colors = getColorClasses(api.color);
            const Icon = api.icon;

            return (
              <div
                key={api.name}
                className={`${colors.bg} border ${colors.border} rounded-lg p-6 transition-shadow hover:shadow-md`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-white border ${colors.border}`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className={`text-xl font-semibold ${colors.title} mb-2`}>
                      {api.name}
                    </h2>
                    <p className="text-[#7A6F65] mb-4">{api.description}</p>

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-[#6B605A]">Key Endpoints:</h3>
                      <div className="space-y-1">
                        {api.endpoints.map((endpoint) => (
                          <div key={endpoint.path} className="flex items-center gap-2">
                            <span className="text-sm text-[#8A7F75] min-w-[150px]">
                              {endpoint.label}:
                            </span>
                            <a
                              href={`${api.baseUrl}${endpoint.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-sm ${colors.link} flex items-center gap-1 hover:underline`}
                            >
                              {api.baseUrl}{endpoint.path}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#E5DDD2]">
                      <a
                        href={api.baseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium ${colors.link} bg-white border ${colors.border} rounded-lg hover:shadow transition-shadow`}
                      >
                        View API Documentation
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-white border border-[#E5DDD2] rounded-lg">
          <h3 className="text-lg font-semibold text-[#6B605A] mb-3">About These APIs</h3>
          <div className="space-y-3 text-sm text-[#7A6F65]">
            <p>
              <strong>Voyager API:</strong> Provides the native search interface with rich faceting capabilities.
              Use this for complex queries with dynamic facet filtering and full-text search.
            </p>
            <p>
              <strong>STAC API:</strong> Implements the SpatioTemporal Asset Catalog standard, making spatial
              data discoverable and accessible through a standardized interface. Ideal for geospatial applications
              and data portals.
            </p>
            <p>
              <strong>OGC API - Records:</strong> Complies with the OGC API - Records standard for catalog services.
              Supports both spatial and non-spatial items like documents, models, and datasets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
