'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, GeoJSON, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './IsochroneMap.module.css';

const RING_COLORS = ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6'];

export interface POI {
  id: number;
  lat: number;
  lon: number;
  name: string;
  tags: Record<string, string>;
  icon: string;
}

interface Props {
  origin:      [number, number] | null;
  geojson:     GeoJsonAny | null;
  geoJsonKey:  number;
  onMapClick:  (lat: number, lon: number) => void;
  pois?:       POI[];
  activePoi?:  number | null;
}

type GeoJsonAny = { type: string; features: FeatureAny[] };
type FeatureAny = { type: string; geometry: unknown; properties: Record<string, unknown> };

function ClickHandler({ onClick }: { onClick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function FlyTo({ origin }: { origin: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (origin) map.flyTo(origin, Math.max(map.getZoom(), 9), { duration: 0.7 });
  }, [origin, map]);
  return null;
}

export default function IsochroneMap({ origin, geojson, geoJsonKey, onMapClick, pois = [], activePoi }: Props) {
  return (
    <MapContainer center={[39.8, -98.5]} zoom={4} className={styles.map} scrollWheelZoom>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickHandler onClick={onMapClick} />
      <FlyTo origin={origin} />

      {/* Origin pin */}
      {origin && (
        <CircleMarker
          center={origin}
          radius={8}
          pathOptions={{ fillColor: '#ef4444', color: '#fff', weight: 2.5, fillOpacity: 1 }}
        />
      )}

      {/* Isochrone rings */}
      {geojson && (
        <GeoJSON
          key={geoJsonKey}
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          data={geojson as any}
          style={(feature) => {
            const idx: number = (feature?.properties as Record<string, number>)?._colorIdx ?? 0;
            return {
              fillColor: RING_COLORS[idx % RING_COLORS.length],
              fillOpacity: 0.12 + idx * 0.06,
              color: RING_COLORS[idx % RING_COLORS.length],
              weight: 2,
            };
          }}
        />
      )}

      {/* POI markers */}
      {pois.map(poi => {
        const isActive = activePoi === poi.id;
        return (
          <CircleMarker
            key={poi.id}
            center={[poi.lat, poi.lon]}
            radius={isActive ? 9 : 6}
            pathOptions={{
              fillColor: isActive ? '#f59e0b' : '#6366f1',
              color: '#fff',
              weight: 1.5,
              fillOpacity: 0.92,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.82em' }}>
                {poi.icon} {poi.name}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
