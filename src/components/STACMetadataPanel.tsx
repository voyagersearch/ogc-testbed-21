import { X, Copy, Download, ExternalLink, MapPin, Calendar, Tag, FileText } from 'lucide-react';
import { useState } from 'react';

interface STACMetadataPanelProps {
  item: any;
  onClose: () => void;
}

export function STACMetadataPanel({ item, onClose }: STACMetadataPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(item, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderPropertyValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Item Details</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Basic Information
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">ID:</span>
              <p className="text-gray-900 font-mono text-xs break-all">{item.id}</p>
            </div>
            <div>
              <span className="text-gray-500">Title:</span>
              <p className="text-gray-900">{item.properties?.title || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Description:</span>
              <p className="text-gray-900">{item.properties?.description || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">STAC Version:</span>
              <p className="text-gray-900">{item.stac_version}</p>
            </div>
          </div>
        </div>

        {item.properties?.datetime && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Temporal Information
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Date/Time:</span>
                <p className="text-gray-900">
                  {new Date(item.properties.datetime).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {item.bbox && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Spatial Information
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Bounding Box:</span>
                <p className="text-gray-900 font-mono text-xs">
                  [{item.bbox.map((n: number) => n.toFixed(4)).join(', ')}]
                </p>
              </div>
              {item.geometry && (
                <div>
                  <span className="text-gray-500">Geometry Type:</span>
                  <p className="text-gray-900">{item.geometry.type}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {Object.keys(item.assets || {}).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Assets
            </h3>
            <div className="space-y-3">
              {Object.entries(item.assets).map(([key, asset]: [string, any]) => (
                <div key={key} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{asset.title || key}</p>
                      {asset.type && (
                        <p className="text-xs text-gray-500">{asset.type}</p>
                      )}
                    </div>
                    {asset.roles && (
                      <div className="flex gap-1">
                        {asset.roles.map((role: string) => (
                          <span key={role} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {asset.description && (
                    <p className="text-xs text-gray-600 mb-2">{asset.description}</p>
                  )}
                  <a
                    href={asset.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 break-all"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{asset.href}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {item.properties && Object.keys(item.properties).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Additional Properties
            </h3>
            <div className="space-y-2 text-sm">
              {Object.entries(item.properties)
                .filter(([key]) => !['title', 'description', 'datetime'].includes(key))
                .map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                    <p className="text-gray-900 break-all">{renderPropertyValue(value)}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {item.links && item.links.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Links
            </h3>
            <div className="space-y-2">
              {item.links.map((link: any, index: number) => (
                <div key={index} className="text-sm">
                  <span className="text-gray-500">{link.rel}:</span>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 block truncate text-xs"
                  >
                    {link.href}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleCopyJson}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy STAC JSON'}
          </button>
        </div>
      </div>
    </div>
  );
}
