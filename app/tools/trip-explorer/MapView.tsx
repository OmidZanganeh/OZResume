'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface WikiPlace {
  uid: string;
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
  thumbnail?: string;
  source: 'wiki' | 'osm';
  category: string;
  color: string;
  osmTags?: Record<string, string>;
}

interface Props {
  center: [number, number];
  zoom: number;
  places: WikiPlace[];
  selectedUid: string | null;
  onPlaceClick: (place: WikiPlace) => void;
  onMapMoveEnd: (lat: number, lon: number) => void;
}

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    const key = `${center[0].toFixed(5)},${center[1].toFixed(5)}`;
    if (prev.current === key) return;
    prev.current = key;
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

function MoveEndHandler({ onMoveEnd }: { onMoveEnd: (lat: number, lon: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => {
      const c = map.getCenter();
      onMoveEnd(c.lat, c.lng);
    };
    map.on('moveend', handler);
    return () => { map.off('moveend', handler); };
  }, [map, onMoveEnd]);
  return null;
}

export default function MapView({ center, zoom, places, selectedUid, onPlaceClick, onMapMoveEnd }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <FlyTo center={center} zoom={zoom} />
      <MoveEndHandler onMoveEnd={onMapMoveEnd} />

      {places.map(place => {
        const isSelected = selectedUid === place.uid;
        return (
          <CircleMarker
            key={place.uid}
            center={[place.lat, place.lon]}
            radius={isSelected ? 12 : 7}
            pathOptions={{
              color: isSelected ? '#f59e0b' : place.color,
              fillColor: isSelected ? '#f59e0b' : place.color,
              fillOpacity: isSelected ? 1 : 0.82,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onPlaceClick(place) }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              {place.title}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
