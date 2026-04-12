'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface Bbox { n: number; s: number; e: number; w: number; }

interface Props {
  onBoundsChange: (b: Bbox) => void;
  onFlyToReady:   (fn: (lat: number, lon: number, zoom?: number) => void) => void;
}

function BoundsTracker({ onBoundsChange }: { onBoundsChange: (b: Bbox) => void }) {
  const map = useMapEvents({
    moveend: () => emit(map, onBoundsChange),
    zoomend: () => emit(map, onBoundsChange),
  });
  // emit on first mount
  useEffect(() => { emit(map, onBoundsChange); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function emit(map: ReturnType<typeof useMapEvents>, cb: (b: Bbox) => void) {
  const b = map.getBounds();
  cb({ n: b.getNorth(), s: b.getSouth(), e: b.getEast(), w: b.getWest() });
}

function FlyToController({ onReady }: { onReady: (fn: (lat: number, lon: number, zoom?: number) => void) => void }) {
  const map = useMapEvents({});
  useEffect(() => {
    onReady((lat, lon, zoom = 13) => map.flyTo([lat, lon], zoom, { duration: 1.2 }));
  }, [map, onReady]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function MapPanel({ onBoundsChange, onFlyToReady }: Props) {
  return (
    <MapContainer
      center={[39.8, -98.6]}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <BoundsTracker onBoundsChange={onBoundsChange} />
      <FlyToController onReady={onFlyToReady} />
      <BboxRect onBoundsChange={onBoundsChange} />
    </MapContainer>
  );
}

// Renders a live rectangle matching the current viewport
function BboxRect({ onBoundsChange }: { onBoundsChange: (b: Bbox) => void }) {
  const map = useMapEvents({
    moveend: () => emit(map, onBoundsChange),
    zoomend: () => emit(map, onBoundsChange),
  });
  const b = map.getBounds();
  return (
    <Rectangle
      bounds={[[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]]}
      pathOptions={{ color: '#3b82f6', weight: 2, fillOpacity: 0.07, dashArray: '6 4' }}
    />
  );
}
