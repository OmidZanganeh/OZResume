'use client';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './ElevationMap.module.css';

interface Props {
  waypoints: [number, number][];
  onAddPoint: (lat: number, lon: number) => void;
  locked: boolean;
}

function DrawHandler({ onAddPoint, locked }: { onAddPoint: (lat: number, lon: number) => void; locked: boolean }) {
  useMapEvents({
    click(e) {
      if (!locked) onAddPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function ElevationMap({ waypoints, onAddPoint, locked }: Props) {
  return (
    <MapContainer
      center={[39.8, -98.5]}
      zoom={4}
      className={`${styles.map} ${locked ? styles.mapLocked : ''}`}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <DrawHandler onAddPoint={onAddPoint} locked={locked} />

      {waypoints.length >= 2 && (
        <Polyline
          positions={waypoints}
          pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.85 }}
        />
      )}

      {waypoints.map((pt, i) => {
        const isFirst = i === 0;
        const isLast  = i === waypoints.length - 1 && waypoints.length > 1;
        return (
          <CircleMarker
            key={i}
            center={pt}
            radius={isFirst || isLast ? 8 : 5}
            pathOptions={{
              fillColor: isFirst ? '#10b981' : isLast ? '#ef4444' : '#3b82f6',
              color: '#fff',
              weight: 2,
              fillOpacity: 1,
            }}
          />
        );
      })}
    </MapContainer>
  );
}
