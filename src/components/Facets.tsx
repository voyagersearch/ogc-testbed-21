import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface FacetsProps {
  facetData: any;
  selectedFacets: Record<string, string[]>;
  onFacetChange: (facetName: string, value: string, isSelected: boolean) => void;
}

interface FacetCategory {
  name: string;
  values: Array<{ value: string; count: number }>;
}

export function Facets({ facetData, selectedFacets, onFacetChange }: FacetsProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  if (!facetData || (!facetData.facets && !facetData.facet_fields)) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Facets</h2>
        <div className="text-sm text-gray-500">No facets available</div>
      </div>
    );
  }

  const parseFacets = () => {
    if (facetData.facets) {
      return Object.entries(facetData.facets)
        .filter(([key]) => key !== 'count')
        .map(([name, data]: [string, any]) => {
          const buckets = data.buckets || [];
          const facetValues = buckets.map((bucket: any) => ({
            value: bucket.val,
            count: bucket.count,
          }));
          return { name, values: facetValues };
        });
    }

    if (facetData.facet_fields) {
      return Object.entries(facetData.facet_fields).map(([name, values]) => {
        const facetValues: Array<{ value: string; count: number }> = [];
        const valueArray = values as any[];

        for (let i = 0; i < valueArray.length; i += 2) {
          facetValues.push({
            value: valueArray[i],
            count: valueArray[i + 1],
          });
        }

        return { name, values: facetValues };
      });
    }

    return [];
  };

  const categories: FacetCategory[] = parseFacets();

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const formatCategoryName = (name: string) => {
    if (name.startsWith('grp_')) {
      return name.substring(4).replace(/_/g, ' ');
    }
    if (name.startsWith('cat_')) {
      return name.substring(4).replace(/_/g, ' ');
    }
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-[#6B605A] mb-4">Facets</h2>

      <div className="space-y-4">
        {categories.map(category => {
          const isExpanded = expandedCategories.has(category.name);
          const hasValues = category.values.length > 0;

          if (!hasValues) return null;

          return (
            <div key={category.name} className="border-b border-[#E5DDD2] pb-4 last:border-b-0">
              <button
                onClick={() => toggleCategory(category.name)}
                className="flex items-center justify-between w-full text-left hover:text-[#8B9B8D] transition-colors"
              >
                <span className="font-medium text-[#6B605A]">
                  {formatCategoryName(category.name)}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[#A39A91]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#A39A91]" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {category.values.map(({ value, count }) => {
                    const isSelected = selectedFacets[category.name]?.includes(value) || false;

                    return (
                      <label
                        key={value}
                        className="flex items-center justify-between cursor-pointer hover:bg-[#F9F7F4] px-2 py-1.5 rounded group"
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => onFacetChange(category.name, value, e.target.checked)}
                            className="w-4 h-4 text-[#8B9B8D] border-[#E5DDD2] rounded focus:ring-[#8B9B8D]"
                          />
                          <span className="ml-2 text-sm text-[#7A6F65] truncate" title={value}>
                            {value}
                          </span>
                        </div>
                        <span className="ml-2 text-xs text-[#A39A91] font-medium">
                          {count.toLocaleString()}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
