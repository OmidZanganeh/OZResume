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
  userLocation: [number, number] | null;
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
    const handler = () => { const c = map.getCenter(); onMoveEnd(c.lat, c.lng); };
    map.on('moveend', handler);
    return () => { map.off('moveend', handler); };
  }, [map, onMoveEnd]);
  return null;
}

export default function MapView({ center, zoom, places, selectedUid, userLocation, onPlaceClick, onMapMoveEnd }: Props) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '100%' }} zoomControl={true}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <FlyTo center={center} zoom={zoom} />
      <MoveEndHandler onMoveEnd={onMapMoveEnd} />

      {/* User location — halo + solid dot */}
      {userLocation && (
        <>
          <CircleMarker
            center={userLocation}
            radius={18}
            pathOptions={{ color: '#4f8ef7', fillColor: '#4f8ef7', fillOpacity: 0.12, weight: 0 }}
            interactive={false}
          />
          <CircleMarker
            center={userLocation}
            radius={8}
            pathOptions={{ color: '#fff', fillColor: '#4f8ef7', fillOpacity: 1, weight: 2.5 }}
            interactive={false}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95} permanent={false}>
              You are here
            </Tooltip>
          </CircleMarker>
        </>
      )}

      {/* Place markers */}
      {places.map(place => {
        const isSel = selectedUid === place.uid;
        return (
          <CircleMarker
            key={place.uid}
            center={[place.lat, place.lon]}
            radius={isSel ? 12 : 7}
            pathOptions={{
              color: isSel ? '#f59e0b' : place.color,
              fillColor: isSel ? '#f59e0b' : place.color,
              fillOpacity: isSel ? 1 : 0.82,
              weight: isSel ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onPlaceClick(place) }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>{place.title}</Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
