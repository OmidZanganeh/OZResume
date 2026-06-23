'use client';

import { useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Tooltip, GeoJSON, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { ISO_RING_COLORS } from './IsoPanel';
import { BASEMAP_TILES, computeHeatCells, heatColor, type MapBasemap } from './mapUtils';

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
  onPlaceClick: (place: WikiPlace) => void;
  onMapMoveEnd: (lat: number, lon: number) => void;
  onMapClick: (lat: number, lon: number) => void;
  // iso overlay
  isoGeojson?: Record<string, unknown> | null;
  isoGeoJsonKey?: number;
  isoOrigin?: [number, number] | null;
  // census overlay
  censusPin?: [number, number] | null;
  censusTract?: { state: string; county: string; tract: string } | null;
  // tab-aware cursor
  activeTab?: string;
  basemap?: MapBasemap;
  showHeatmap?: boolean;
  drawVertices?: [number, number][];
  customPolygon?: [number, number][] | null;
  drawMode?: boolean;
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

function MapEventHandler({ onMoveEnd, onClick, suppressClick }: {
  onMoveEnd: (lat: number, lon: number) => void;
  onClick: (lat: number, lon: number) => void;
  suppressClick?: boolean;
}) {
  useMapEvents({
    moveend: e => { const c = e.target.getCenter(); onMoveEnd(c.lat, c.lng); },
    click:   e => { if (!suppressClick) onClick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

function HeatmapLayer({ places }: { places: WikiPlace[] }) {
  const cells = computeHeatCells(places);
  return (
    <>
      {cells.map((cell, i) => (
        <CircleMarker
          key={`heat-${i}`}
          center={[cell.lat, cell.lon]}
          radius={10 + cell.intensity * 22}
          pathOptions={{
            color: heatColor(cell.intensity),
            fillColor: heatColor(cell.intensity),
            fillOpacity: 0.12 + cell.intensity * 0.38,
            weight: 0,
          }}
          interactive={false}
        />
      ))}
    </>
  );
}

// ── Census tract boundary (fetches TIGERweb GeoJSON) ─────────────────────────
function TractLayer({ state, county, tract }: { state: string; county: string; tract: string }) {
  const map      = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const url  =
      `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2023/MapServer/8/query` +
      `?where=STATE+%3D+%27${state}%27+AND+COUNTY+%3D+%27${county}%27+AND+TRACT+%3D+%27${tract}%27` +
      `&outFields=STATE,COUNTY,TRACT&returnGeometry=true&f=geojson`;

    if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }

    fetch(url, { signal: ctrl.signal })
      .then(r => r.json())
      .then((geojson: Parameters<typeof L.geoJSON>[0]) => {
        if (ctrl.signal.aborted) return;
        const layer = L.geoJSON(geojson, {
          style: { color: '#4f8ef7', weight: 2.5, fillColor: '#4f8ef7', fillOpacity: 0.12 },
        }).addTo(map);
        layerRef.current = layer;
        const bounds = layer.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      })
      .catch(() => {});

    return () => {
      ctrl.abort();
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    };
  }, [state, county, tract, map]);

  return null;
}

// ── ISO origin icon ───────────────────────────────────────────────────────────
function makeIsoOriginIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 2px 8px rgba(239,68,68,0.6)"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9],
  });
}

// ── Census pin icon ───────────────────────────────────────────────────────────
function makeCensusPinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 21 13 21s13-11.25 13-21C26 5.82 20.18 0 13 0z"
          fill="#4f8ef7" stroke="#fff" stroke-width="2"/>
        <circle cx="13" cy="13" r="5" fill="#fff"/>
      </svg>`,
    iconSize: [26, 34], iconAnchor: [13, 34], tooltipAnchor: [0, -34],
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MapView({
  center, zoom, places, selectedUid, userLocation,
  pinnedLocation, onPlaceClick, onMapMoveEnd, onMapClick,
  isoGeojson, isoGeoJsonKey, isoOrigin,
  censusPin, censusTract,
  activeTab = 'explore',
  basemap = 'dark',
  showHeatmap = false,
  drawVertices = [],
  customPolygon = null,
  drawMode = false,
}: Props) {
  const pinIcon        = useRef<L.DivIcon | null>(null);
  const isoOriginIcon  = useRef<L.DivIcon | null>(null);
  const censusPinIcon  = useRef<L.DivIcon | null>(null);

  if (typeof window !== 'undefined') {
    if (!pinIcon.current)       pinIcon.current       = makePinIcon();
    if (!isoOriginIcon.current) isoOriginIcon.current = makeIsoOriginIcon();
    if (!censusPinIcon.current) censusPinIcon.current = makeCensusPinIcon();
  }

  // Pre-build icons for all places (memoised by uid+selected state)
  const iconCache = useRef<Map<string, L.DivIcon>>(new Map());
  const getIcon = useCallback((place: WikiPlace, selected: boolean): L.DivIcon => {
    const key = `${place.uid}:${selected}`;
    if (!iconCache.current.has(key)) {
      iconCache.current.set(key, makePlaceIcon(place.color, place.category, selected));
    }
    return iconCache.current.get(key)!;
  }, []);

  const crosshairTabs = ['iso', 'census'];
  const cursor = crosshairTabs.includes(activeTab) || drawMode ? 'crosshair' : 'pointer';
  const tiles = BASEMAP_TILES[basemap];

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%', cursor }}
      zoomControl
    >
      <TileLayer
        key={basemap}
        url={tiles.url}
        attribution={tiles.attribution}
        maxZoom={19}
      />
      <FlyTo center={center} zoom={zoom} />
      <MapEventHandler onMoveEnd={onMapMoveEnd} onClick={onMapClick} />

      {showHeatmap && places.length > 1 && <HeatmapLayer places={places} />}

      {/* Custom draw polygon */}
      {customPolygon && customPolygon.length >= 3 && (
        <Polygon
          positions={customPolygon}
          pathOptions={{ color: '#a855f7', weight: 2, fillColor: '#a855f7', fillOpacity: 0.12 }}
        />
      )}
      {drawVertices.length > 0 && (
        <>
          <Polyline positions={drawVertices} pathOptions={{ color: '#c084fc', weight: 2, dashArray: '6 4' }} />
          {drawVertices.map((pt, i) => (
            <CircleMarker
              key={`dv-${i}`}
              center={pt}
              radius={5}
              pathOptions={{ color: '#fff', fillColor: '#a855f7', fillOpacity: 1, weight: 2 }}
              interactive={false}
            />
          ))}
        </>
      )}

      {/* ── ISO rings ── */}
      {isoGeojson && (
        <GeoJSON
          key={isoGeoJsonKey}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data={isoGeojson as any}
          style={(feature) => {
            const idx = (feature?.properties as Record<string, number>)?._colorIdx ?? 0;
            const col = ISO_RING_COLORS[idx % ISO_RING_COLORS.length];
            return { fillColor: col, fillOpacity: 0.12 + idx * 0.04, color: col, weight: 2 };
          }}
        />
      )}

      {/* ── ISO origin dot ── */}
      {isoOrigin && isoOriginIcon.current && (
        <Marker position={isoOrigin} icon={isoOriginIcon.current} interactive={false}>
          <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>Origin</Tooltip>
        </Marker>
      )}

      {/* ── Census tract boundary ── */}
      {censusTract && (
        <TractLayer state={censusTract.state} county={censusTract.county} tract={censusTract.tract} />
      )}

      {/* ── Census pin ── */}
      {censusPin && censusPinIcon.current && (
        <Marker position={censusPin} icon={censusPinIcon.current} interactive={false}>
          <Tooltip direction="top" offset={[0, -34]} opacity={0.95}>
            {censusPin[0].toFixed(4)}, {censusPin[1].toFixed(4)}
          </Tooltip>
        </Marker>
      )}

      {/* ── User location — halo + dot ── */}
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

      {/* ── Pinned explore location ── */}
      {pinnedLocation && pinIcon.current && (
        <Marker position={pinnedLocation} icon={pinIcon.current} interactive={false}>
          <Tooltip direction="top" offset={[0, -36]} opacity={0.95}>Click "Discover here" →</Tooltip>
        </Marker>
      )}

      {/* ── Clustered place markers ── */}
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
