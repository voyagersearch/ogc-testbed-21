import { Image, ExternalLink, FileText } from 'lucide-react';

interface RecordCardProps {
  record: any;
  isSelected?: boolean;
  onClick?: () => void;
}

export function RecordCard({ record, isSelected = false, onClick }: RecordCardProps) {
  const properties = record.properties || {};
  const links = Array.isArray(record.links) ? record.links : [];
  const title = properties.title || record.id || 'Untitled Record';
  const description = properties.description || '';

  const previewLink = links.find((link: any) => link.rel === 'preview');
  const thumbnailUrl = previewLink?.href;
  const hasThumbnail = thumbnailUrl && typeof thumbnailUrl === 'string' && thumbnailUrl.startsWith('http');

  const downloadLink = links.find((link: any) => link.rel === 'enclosure');
  const alternateLink = links.find((link: any) => link.rel === 'alternate');

  const getAttributesToDisplay = () => {
    const attributes: { key: string; value: any }[] = [];
    const excludeKeys = ['title', 'description'];

    Object.entries(properties).forEach(([key, value]) => {
      if (!excludeKeys.includes(key) && value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            attributes.push({ key, value: value.join(', ') });
          }
        } else if (typeof value === 'object') {
          attributes.push({ key, value: JSON.stringify(value, null, 2) });
        } else {
          attributes.push({ key, value: String(value) });
        }
      }
    });

    if (record.conformsTo && record.conformsTo.length > 0) {
      attributes.push({
        key: 'conformsTo',
        value: record.conformsTo.join(', ')
      });
    }

    if (record.geometry) {
      attributes.push({
        key: 'geometry',
        value: JSON.stringify(record.geometry, null, 2)
      });
    }

    return attributes;
  };

  const attributes = getAttributesToDisplay();

  return (
    <div
      className={`relative bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md cursor-pointer ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'
      }`}
      style={{ perspective: '1000px' }}
      onClick={onClick}
    >
      <div
        className={`relative w-full transition-transform duration-500 transform-style-3d ${
          isSelected ? 'rotate-y-180' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isSelected ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div
          className="w-full backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
            {hasThumbnail ? (
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const parent = target.parentElement;
                  if (parent) {
                    target.remove();
                    const iconDiv = document.createElement('div');
                    iconDiv.className = 'flex items-center justify-center w-full h-full';
                    iconDiv.innerHTML = '<svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>';
                    parent.appendChild(iconDiv);
                  }
                }}
              />
            ) : (
              <FileText className="w-16 h-16 text-gray-300" />
            )}
          </div>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{title}</h3>
            {description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description}</p>
            )}
          </div>
        </div>

        <div
          className="absolute inset-0 w-full backface-hidden bg-white"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          <div className="h-full overflow-y-auto p-4">
            <div className="sticky top-0 bg-white pb-2 border-b border-gray-200 mb-3 z-10">
              <h3
                className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
              >
                {title}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                {alternateLink && (
                  <a
                    href={alternateLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Source
                  </a>
                )}
                {downloadLink && (
                  <a
                    href={downloadLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Download
                  </a>
                )}
              </div>
            </div>
            {description && (
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-700">Description:</div>
                <div className="text-xs text-gray-600 whitespace-pre-wrap">{description}</div>
              </div>
            )}
            <div className="space-y-2">
              {attributes.map(({ key, value }) => (
                <div key={key} className="text-xs">
                  <div className="font-medium text-gray-700 break-words">{key}:</div>
                  <div className="text-gray-600 break-words whitespace-pre-wrap">{value}</div>
                </div>
              ))}
              {attributes.length === 0 && (
                <div className="text-xs text-gray-500">No additional attributes available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
