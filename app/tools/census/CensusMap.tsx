'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './CensusMap.module.css';

const pinIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

function FlyTo({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    if (isNaN(lat) || isNaN(lon)) return;
    map.flyTo([lat, lon], Math.max(map.getZoom(), 11), { duration: 0.7 });
  }, [lat, lon, map]);
  return null;
}

interface Props {
  lat: number | null;
  lon: number | null;
  onPick: (lat: number, lon: number) => void;
}

export default function CensusMap({ lat, lon, onPick }: Props) {
  const hasPin = lat !== null && lon !== null;

  return (
    <MapContainer
      center={[38.5, -96]}
      zoom={4}
      className={styles.map}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickHandler onPick={onPick} />
      {hasPin && (
        <>
          <FlyTo lat={lat!} lon={lon!} />
          <Marker position={[lat!, lon!]} icon={pinIcon} />
        </>
      )}
    </MapContainer>
  );
}
