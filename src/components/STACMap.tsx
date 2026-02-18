import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface STACMapProps {
  items: any[];
  selectedItem?: any;
  onItemSelect?: (item: any) => void;
}

function MapUpdater({ items, selectedItem }: { items: any[]; selectedItem?: any }) {
  const map = useMap();

  useEffect(() => {
    if (items.length > 0) {
      const bounds: [number, number][] = [];
      items.forEach(item => {
        if (item.bbox && Array.isArray(item.bbox) && item.bbox.length >= 4) {
          bounds.push([item.bbox[1], item.bbox[0]]);
          bounds.push([item.bbox[3], item.bbox[2]]);
        }
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 10 });
      }
    }
  }, [items, map]);

  useEffect(() => {
    if (selectedItem?.bbox && Array.isArray(selectedItem.bbox) && selectedItem.bbox.length >= 4) {
      const bounds: L.LatLngBoundsExpression = [
        [selectedItem.bbox[1], selectedItem.bbox[0]],
        [selectedItem.bbox[3], selectedItem.bbox[2]]
      ];
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [selectedItem, map]);

  return null;
}

export function STACMap({ items, selectedItem, onItemSelect }: STACMapProps) {
  const markerRefs = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (selectedItem?.id && markerRefs.current[selectedItem.id]) {
      markerRefs.current[selectedItem.id].openPopup();
    }
  }, [selectedItem]);

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[0, 0]}
        zoom={2}
        className="h-full w-full"
        style={{ background: '#f3f4f6' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater items={items} selectedItem={selectedItem} />

        {items.map((item, index) => {
          if (!item.bbox || !Array.isArray(item.bbox) || item.bbox.length < 4) {
            return null;
          }

          const bounds: [[number, number], [number, number]] = [
            [item.bbox[1], item.bbox[0]],
            [item.bbox[3], item.bbox[2]]
          ];

          const center: [number, number] = [
            (item.bbox[1] + item.bbox[3]) / 2,
            (item.bbox[0] + item.bbox[2]) / 2
          ];

          const isSelected = selectedItem?.id === item.id;

          if (isSelected) {
            console.log('Map highlighting item:', item.id, 'selectedItem:', selectedItem?.id);
          }

          return (
            <div key={item.id || `map-item-${index}`}>
              <Rectangle
                bounds={bounds}
                pathOptions={{
                  color: isSelected ? '#3b82f6' : '#10b981',
                  fillColor: isSelected ? '#3b82f6' : '#10b981',
                  fillOpacity: 0.2,
                  weight: isSelected ? 3 : 2
                }}
                eventHandlers={{
                  click: () => onItemSelect?.(item)
                }}
              />

              <Marker
                position={center}
                eventHandlers={{ click: () => onItemSelect?.(item) }}
                ref={(ref) => {
                  if (ref && item.id) {
                    markerRefs.current[item.id] = ref;
                  }
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm mb-1">
                      {item.properties?.title || item.id}
                    </h3>
                    {item.properties?.description && (
                      <p className="text-xs text-gray-600 line-clamp-3">
                        {item.properties.description}
                      </p>
                    )}
                    {item.properties?.datetime && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.properties.datetime).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
