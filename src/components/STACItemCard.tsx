import { Image, Calendar, MapPin, Download, ExternalLink } from 'lucide-react';
import { generateVoyagerThumbnailUrl } from '../utils/thumbnailGenerator';

interface STACItemCardProps {
  item: any;
  isSelected?: boolean;
  onClick?: () => void;
  baseUrl?: string;
}

export function STACItemCard({ item, isSelected, onClick, baseUrl }: STACItemCardProps) {
  const originalDoc = item.properties?.originalDoc || item;
  const generatedThumbnail = generateVoyagerThumbnailUrl(originalDoc, baseUrl);
  const thumbnail = generatedThumbnail || item.assets?.thumbnail?.href || item.assets?.data?.href;
  const title = item.properties?.title || item.id;
  const description = item.properties?.description || '';
  const datetime = item.properties?.datetime;

  const hasThumbnail = thumbnail && typeof thumbnail === 'string' && thumbnail.startsWith('http');

  return (
    <div
      onClick={onClick}
      className={`
        bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}
      `}
    >
      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden relative">
        {hasThumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          <Image className="w-12 h-12 text-gray-300" />
        )}

        {item.bbox && (
          <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs flex items-center gap-1">
            <MapPin className="w-3 h-3 text-green-600" />
            <span className="text-gray-700">Geo</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">
          {title}
        </h3>
        <div className="text-xs text-gray-400 font-mono mb-2">
          ID: {item.id}
        </div>

        {description && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-3">
            {description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          {datetime && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(datetime).toLocaleDateString()}</span>
            </div>
          )}

          {item.properties?.format && (
            <div className="bg-gray-100 px-2 py-1 rounded">
              {item.properties.format}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          {item.assets?.data?.href && (
            <a
              href={item.assets.data.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <Download className="w-3 h-3" />
              Download
            </a>
          )}

          {item.links?.find((l: any) => l.rel === 'alternate')?.href && (
            <a
              href={item.links.find((l: any) => l.rel === 'alternate').href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-3 h-3" />
              Source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
