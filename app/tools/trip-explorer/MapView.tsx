'use client';

import { useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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
  pinnedLocation: [number, number] | null;
  pinMode: boolean;
  onPlaceClick: (place: WikiPlace) => void;
  onMapMoveEnd: (lat: number, lon: number) => void;
  onMapClick: (lat: number, lon: number) => void;
}

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prev = useRef('');
  useEffect(() => {
    const key = `${center[0].toFixed(5)},${center[1].toFixed(5)}`;
    if (prev.current === key) return;
    prev.current = key;
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

function MapEventHandler({
  pinMode,
  onMoveEnd,
  onClick,
}: {
  pinMode: boolean;
  onMoveEnd: (lat: number, lon: number) => void;
  onClick: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    moveend: e => { const c = e.target.getCenter(); onMoveEnd(c.lat, c.lng); },
    click: e => { if (pinMode) onClick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// Custom pin DivIcon for pinned location
const makePinIcon = () =>
  L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="#f59e0b" stroke="#fff" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="#fff"/>
    </svg>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  });

export default function MapView({
  center, zoom, places, selectedUid, userLocation, pinnedLocation,
  pinMode, onPlaceClick, onMapMoveEnd, onMapClick,
}: Props) {
  const pinIcon = useRef(typeof window !== 'undefined' ? makePinIcon() : null);

  const handleMapClick = useCallback(
    (lat: number, lon: number) => { if (pinMode) onMapClick(lat, lon); },
    [pinMode, onMapClick],
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%', cursor: pinMode ? 'crosshair' : '' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <FlyTo center={center} zoom={zoom} />
      <MapEventHandler pinMode={pinMode} onMoveEnd={onMapMoveEnd} onClick={handleMapClick} />

      {/* User location — halo + dot */}
      {userLocation && (
        <>
          <CircleMarker center={userLocation} radius={18} pathOptions={{ color: '#4f8ef7', fillColor: '#4f8ef7', fillOpacity: 0.12, weight: 0 }} interactive={false} />
          <CircleMarker center={userLocation} radius={8} pathOptions={{ color: '#fff', fillColor: '#4f8ef7', fillOpacity: 1, weight: 2.5 }} interactive={false}>
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>You are here</Tooltip>
          </CircleMarker>
        </>
      )}

      {/* Pinned location marker */}
      {pinnedLocation && pinIcon.current && (
        <Marker position={pinnedLocation} icon={pinIcon.current} interactive={false}>
          <Tooltip direction="top" offset={[0, -36]} opacity={0.95} permanent={false}>Pinned location</Tooltip>
        </Marker>
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
