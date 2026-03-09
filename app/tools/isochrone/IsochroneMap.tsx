'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, GeoJSON, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './IsochroneMap.module.css';

const RING_COLORS = ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6'];

interface Props {
  origin: [number, number] | null;
  geojson: GeoJsonAny | null;
  geoJsonKey: number;
  onMapClick: (lat: number, lon: number) => void;
}

/* We use a loose type so we don't need @types/geojson separately */
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

export default function IsochroneMap({ origin, geojson, geoJsonKey, onMapClick }: Props) {
  return (
    <MapContainer center={[39.8, -98.5]} zoom={4} className={styles.map} scrollWheelZoom>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickHandler onClick={onMapClick} />
      <FlyTo origin={origin} />

      {origin && (
        <CircleMarker
          center={origin}
          radius={8}
          pathOptions={{ fillColor: '#ef4444', color: '#fff', weight: 2.5, fillOpacity: 1 }}
        />
      )}

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
    </MapContainer>
  );
}
