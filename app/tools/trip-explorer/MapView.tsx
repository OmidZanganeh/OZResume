'use client';

import { useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
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

// ── Tiny category SVG paths (Lucide-style, viewBox 0 0 24 24) ─────────────────
const CATEGORY_PATHS: Record<string, string> = {
  all:           'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0v20M2 12h20M12 2c-4 6-4 14 0 20M12 2c4 6 4 14 0 20',
  landmarks:     'M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2 2 7h20z',
  restaurants:   'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
  cafes:         'M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z',
  hotels:        'M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9',
  parks:         'M17 14c0 4-5 7-5 7s-5-3-5-7a5 5 0 0 1 10 0zM12 4v3M5 9l2 2M19 9l-2 2',
  culture:       'M12 2a3 3 0 0 0-3 3v7l-2 2v1h14v-1l-2-2V5a3 3 0 0 0-3-3zM9 18a3 3 0 0 0 6 0',
  entertainment: 'M2 8h20v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM16 2l-4 6-4-6',
  beach:         'M2 18c7-7 13-7 20 0M12 4v8M8 8l4-4 4 4',
  nightlife:     'M8 22h8M7 10h10M12 2v8M5 3l2 2M19 3l-2 2M3 11h2M19 11h2',
  shopping:      'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  health:        'M22 12h-4l-3 9L9 3l-3 9H2',
};

function getCategoryPath(catId: string): string {
  return CATEGORY_PATHS[catId] ?? CATEGORY_PATHS['all'];
}

// ── Icon factory ──────────────────────────────────────────────────────────────
function makePlaceIcon(color: string, catId: string, selected: boolean): L.DivIcon {
  const size = selected ? 38 : 30;
  const half = size / 2;
  const iconSize = selected ? 14 : 11;
  const path = getCategoryPath(catId);
  const shadow = selected
    ? `drop-shadow(0 3px 8px ${color}99) drop-shadow(0 1px 3px rgba(0,0,0,0.5))`
    : `drop-shadow(0 2px 4px rgba(0,0,0,0.45))`;
  const border = selected ? 3 : 2;

  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};
      border:${border}px solid ${selected ? '#fff' : 'rgba(255,255,255,0.85)'};
      display:flex;align-items:center;justify-content:center;
      filter:${shadow};
      transition:transform 0.15s;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24"
        fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="${path}"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    className: '',
    html,
    iconSize: [size, size],
    iconAnchor: [half, half],
    tooltipAnchor: [0, -half - 2],
  });
}

// ── Custom cluster icon ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createClusterIcon(cluster: any): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 10 ? 34 : count < 50 ? 40 : 46;
  const half = size / 2;
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:rgba(79,142,247,0.92);
        border:2.5px solid #fff;
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:${count < 10 ? 13 : 12}px;font-weight:700;
        font-family:-apple-system,sans-serif;
        box-shadow:0 2px 10px rgba(79,142,247,0.5),0 1px 3px rgba(0,0,0,0.3);
      ">${count}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

// ── Pinned location icon ──────────────────────────────────────────────────────
function makePinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z"
          fill="#f59e0b" stroke="#fff" stroke-width="2"/>
        <circle cx="14" cy="14" r="6" fill="#fff"/>
      </svg>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    tooltipAnchor: [0, -36],
  });
}

// ── Map utility components ────────────────────────────────────────────────────
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

function MapEventHandler({ pinMode, onMoveEnd, onClick }: {
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

// ── Main component ────────────────────────────────────────────────────────────
export default function MapView({
  center, zoom, places, selectedUid, userLocation,
  pinnedLocation, pinMode, onPlaceClick, onMapMoveEnd, onMapClick,
}: Props) {
  const pinIcon = useRef<L.DivIcon | null>(null);
  if (typeof window !== 'undefined' && !pinIcon.current) {
    pinIcon.current = makePinIcon();
  }

  const handleMapClick = useCallback(
    (lat: number, lon: number) => { if (pinMode) onMapClick(lat, lon); },
    [pinMode, onMapClick],
  );

  // Pre-build icons for all places (memoised by uid+selected state)
  const iconCache = useRef<Map<string, L.DivIcon>>(new Map());
  const getIcon = useCallback((place: WikiPlace, selected: boolean): L.DivIcon => {
    const key = `${place.uid}:${selected}`;
    if (!iconCache.current.has(key)) {
      iconCache.current.set(key, makePlaceIcon(place.color, place.category, selected));
    }
    return iconCache.current.get(key)!;
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%', cursor: pinMode ? 'crosshair' : undefined }}
      zoomControl
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
          <CircleMarker center={userLocation} radius={18}
            pathOptions={{ color: '#4f8ef7', fillColor: '#4f8ef7', fillOpacity: 0.12, weight: 0 }}
            interactive={false}
          />
          <CircleMarker center={userLocation} radius={8}
            pathOptions={{ color: '#fff', fillColor: '#4f8ef7', fillOpacity: 1, weight: 2.5 }}
            interactive={false}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>You are here</Tooltip>
          </CircleMarker>
        </>
      )}

      {/* Pinned location */}
      {pinnedLocation && pinIcon.current && (
        <Marker position={pinnedLocation} icon={pinIcon.current} interactive={false}>
          <Tooltip direction="top" offset={[0, -36]} opacity={0.95}>Pinned location</Tooltip>
        </Marker>
      )}

      {/* Clustered place markers */}
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterIcon}
        maxClusterRadius={50}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
        zoomToBoundsOnClick
      >
        {places.map(place => {
          const isSel = selectedUid === place.uid;
          return (
            <Marker
              key={place.uid}
              position={[place.lat, place.lon]}
              icon={getIcon(place, isSel)}
              zIndexOffset={isSel ? 1000 : 0}
              eventHandlers={{ click: () => onPlaceClick(place) }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>{place.title}</Tooltip>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
