'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './MapPicker.module.css';

/* Fix Leaflet's broken default icon paths when bundled with webpack */
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  lat: number;
  lon: number;
  onPick: (lat: number, lon: number) => void;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* Smoothly pans the map whenever lat/lon change, with a debounce so
   rapid typing doesn't cause jittery animation */
function FlyTo({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
    const t = setTimeout(() => {
      map.flyTo([lat, lon], map.getZoom(), { duration: 0.6 });
    }, 350);
    return () => clearTimeout(t);
  }, [lat, lon, map]);
  return null;
}

export default function MapPicker({ lat, lon, onPick }: Props) {
  const valid = !isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const center: [number, number] = valid ? [lat, lon] : [40.7128, -74.006];

  return (
    <div className={styles.wrap}>
      <MapContainer center={center} zoom={6} className={styles.map} scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickHandler onPick={onPick} />
        {valid && (
          <>
            <FlyTo lat={lat} lon={lon} />
            <Marker
              position={[lat, lon]}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend(e) {
                  const m = e.target as L.Marker;
                  const p = m.getLatLng();
                  onPick(p.lat, p.lng);
                },
              }}
            />
          </>
        )}
      </MapContainer>
      <p className={styles.hint}>
        Click the map or drag the pin to set coordinates
      </p>
    </div>
  );
}
