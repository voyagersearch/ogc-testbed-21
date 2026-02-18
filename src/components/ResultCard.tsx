import { Image, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { generateVoyagerThumbnailUrl } from '../utils/thumbnailGenerator';
import { fetchStandards, type Standard } from '../services/standardsApi';

interface ResultCardProps {
  result: any;
  isSelected?: boolean;
  onClick?: () => void;
  transformApiUrl?: string;
  baseUrl?: string;
}

export function ResultCard({ result, isSelected = false, onClick, transformApiUrl, baseUrl }: ResultCardProps) {
  const generatedThumbnail = generateVoyagerThumbnailUrl(result, baseUrl);
  const thumbnail = generatedThumbnail || result.thumb || result.thumbnail || result.image || null;
  const title = result.name || result.title || result.id || 'Untitled';
  const hasThumbnail = thumbnail && typeof thumbnail === 'string' && thumbnail.startsWith('http');
  const [showTransformed, setShowTransformed] = useState(false);
  const [transformedData, setTransformedData] = useState<any>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string>('iso19115');

  useEffect(() => {
    fetchStandards()
      .then(setStandards)
      .catch((error) => {
        console.error('Error fetching standards:', error);
        setStandards([]);
      });
  }, []);

  const getAttributesToDisplay = () => {
    const attributes: { key: string; value: any }[] = [];
    const excludeKeys = ['thumb', 'thumbnail', 'image', 'path_to_thumb', 'fullpath', 'absolute_path', 'hasPreview', 'path_to_preview', 'location'];

    Object.entries(result).forEach(([key, value]) => {
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

    return attributes;
  };

  const handleTransform = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (showTransformed) {
      setShowTransformed(false);
      return;
    }

    setIsTransforming(true);
    setTransformError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transform-proxy`;

      const requestBody: any = {
        json: result,
        standard: selectedStandard
      };

      if (transformApiUrl) {
        requestBody.transformApiUrl = transformApiUrl;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Transform failed: ${response.status}`);
      }

      const data = await response.json();
      setTransformedData(data);
      setShowTransformed(true);
    } catch (error) {
      console.error('Transform error:', error);
      setTransformError(error instanceof Error ? error.message : 'Failed to transform metadata');
    } finally {
      setIsTransforming(false);
    }
  };

  const attributes = getAttributesToDisplay();

  const getTransformedAttributes = () => {
    if (!transformedData) return [];

    const transformedJson = transformedData.transformedJson || transformedData;

    const attributes: { key: string; value: any }[] = [];
    const excludeKeys = ['thumb', 'thumbnail', 'image', 'path_to_thumb', 'fullpath', 'absolute_path', 'hasPreview', 'path_to_preview', 'location'];

    Object.entries(transformedJson).forEach(([key, value]) => {
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

    return attributes;
  };

  const displayAttributes = showTransformed ? getTransformedAttributes() : attributes;

  console.log('ResultCard - result:', result);
  console.log('ResultCard - thumbnail:', thumbnail);
  console.log('ResultCard - hasThumbnail:', hasThumbnail);

  return (
    <div
      className={`relative bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md cursor-pointer ${
        isSelected ? 'border-[#8B9B8D] ring-2 ring-[#8B9B8D]' : 'border-[#E5DDD2]'
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
          <div className="aspect-square bg-[#F5F2ED] flex items-center justify-center overflow-hidden">
            {hasThumbnail ? (
              <img
                src={thumbnail}
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
                    iconDiv.innerHTML = '<svg class="w-16 h-16 text-[#D4CFC6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>';
                    parent.appendChild(iconDiv);
                  }
                }}
              />
            ) : (
              <Image className="w-16 h-16 text-[#D4CFC6]" />
            )}
          </div>
          <div className="p-4">
            <h3 className="text-sm font-medium text-[#6B605A] line-clamp-2">{title}</h3>
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
            <div className="sticky top-0 bg-white pb-2 border-b border-[#E5DDD2] mb-3 z-10">
              <div className="flex items-center justify-between mb-2">
                <h3
                  className="text-sm font-semibold text-[#6B605A] cursor-pointer hover:text-[#8B9B8D]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick?.();
                  }}
                >
                  {showTransformed ? 'Transformed Attributes' : 'Attributes'}
                </h3>
                <button
                  onClick={handleTransform}
                  disabled={isTransforming}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                    showTransformed
                      ? 'bg-[#8B9B8D] text-white hover:bg-[#7A8A7D]'
                      : 'bg-[#F5F2ED] text-[#7A6F65] hover:bg-[#EDE9E3]'
                  } ${isTransforming ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={showTransformed ? 'Show original attributes' : 'Transform metadata'}
                >
                  <Sparkles className="w-3 h-3" />
                  {isTransforming ? 'Loading...' : showTransformed ? 'Original' : 'Transform'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#7A6F65]">Standard:</label>
                <select
                  value={selectedStandard}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSelectedStandard(e.target.value);
                    setTransformedData(null);
                    setShowTransformed(false);
                  }}
                  className="text-xs border border-[#E5DDD2] rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B9B8D] text-[#6B605A]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {standards.length > 0 ? (
                    standards.map((standard) => (
                      <option key={standard.id} value={standard.id}>
                        {standard.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="iso19115">ISO 19115</option>
                      <option value="fgdc">FGDC</option>
                      <option value="landsat">Landsat</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            {transformError && (
              <div className="mb-2 p-2 bg-[#FAEBEB] border border-[#E5C7C7] rounded text-xs text-[#A35555]">
                {transformError}
              </div>
            )}
            <div className="space-y-2">
              {displayAttributes.map(({ key, value }) => (
                <div key={key} className="text-xs">
                  <div className="font-medium text-[#7A6F65] break-words">{key}:</div>
                  <div className="text-[#8A7F75] break-words whitespace-pre-wrap">{value}</div>
                </div>
              ))}
              {displayAttributes.length === 0 && (
                <div className="text-xs text-[#A39A91]">No attributes available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
