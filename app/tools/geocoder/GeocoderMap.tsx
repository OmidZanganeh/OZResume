'use client';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './GeocoderMap.module.css';
import type { MapPoint } from './page';

const okIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/* Red icon for failed / uncertain points */
const failIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/* Fit map to all current markers whenever points change */
function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const prevLen = useRef(0);

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === prevLen.current) return;
    prevLen.current = points.length;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 12, { animate: true, duration: 0.6 });
    } else {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [40, 40], animate: true, duration: 0.6, maxZoom: 14 });
    }
  }, [points, map]);

  return null;
}

interface Props { points: MapPoint[]; }

export default function GeocoderMap({ points }: Props) {
  return (
    <div className={styles.wrap}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className={styles.map}
        scrollWheelZoom
        worldCopyJump
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds points={points} />
        {points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lon]} icon={p.ok ? okIcon : failIcon}>
            <Popup>
              <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', maxWidth: '240px' }}>
                <strong style={{ fontSize: '13px' }}>#{i + 1}</strong>
                <br />
                <span style={{ color: '#6b7280', fontSize: '11px' }}>
                  {p.lat.toFixed(6)}, {p.lon.toFixed(6)}
                </span>
                <br /><br />
                {p.label}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
