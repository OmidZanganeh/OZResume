'use client';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Rectangle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface Bbox { n: number; s: number; e: number; w: number; }

interface Props {
  onBoundsChange: (b: Bbox) => void;
  onFlyToReady:   (fn: (lat: number, lon: number, zoom?: number) => void) => void;
  drawMode:       boolean;
  customBbox:     Bbox | null;
  onDraw:         (b: Bbox) => void;
}

function lbToBbox(b: L.LatLngBounds): Bbox {
  return { n: b.getNorth(), s: b.getSouth(), e: b.getEast(), w: b.getWest() };
}

// ─── Tracks viewport bounds and notifies parent ──────────────────────────────
function BoundsTracker({ onBoundsChange }: { onBoundsChange: (b: Bbox) => void }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(lbToBbox(map.getBounds())),
    zoomend: () => onBoundsChange(lbToBbox(map.getBounds())),
  });
  useEffect(() => { onBoundsChange(lbToBbox(map.getBounds())); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ─── Exposes flyTo to parent via callback ────────────────────────────────────
function FlyToController({ onReady }: { onReady: (fn: (lat: number, lon: number, zoom?: number) => void) => void }) {
  const map = useMapEvents({});
  useEffect(() => {
    onReady((lat, lon, zoom = 13) => map.flyTo([lat, lon], zoom, { duration: 1.2 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ─── Click-and-drag rectangle drawing ────────────────────────────────────────
function DrawController({ active, onDraw }: { active: boolean; onDraw: (b: Bbox) => void }) {
  const map = useMapEvents({});

  useEffect(() => {
    if (!active) return;

    const container = map.getContainer();
    container.style.cursor = 'crosshair';
    map.dragging.disable();
    map.scrollWheelZoom.disable();

    let start: L.LatLng | null = null;
    let rect: L.Rectangle | null = null;

    function onDown(e: L.LeafletMouseEvent) {
      start = e.latlng;
      if (rect) map.removeLayer(rect);
      rect = L.rectangle(L.latLngBounds(e.latlng, e.latlng), {
        color: '#f59e0b', weight: 2.5,
        fillColor: '#f59e0b', fillOpacity: 0.12,
        interactive: false,
      }).addTo(map);
    }

    function onMove(e: L.LeafletMouseEvent) {
      if (!start || !rect) return;
      rect.setBounds(L.latLngBounds(start, e.latlng));
    }

    function onUp(e: L.LeafletMouseEvent) {
      if (!start) return;
      const bounds = L.latLngBounds(start, e.latlng);
      if (rect) { map.removeLayer(rect); rect = null; }
      const b: Bbox = {
        n: bounds.getNorth(), s: bounds.getSouth(),
        e: bounds.getEast(),  w: bounds.getWest(),
      };
      // Ignore accidental single-clicks (< ~100m box)
      if (Math.abs(b.n - b.s) > 0.001 && Math.abs(b.e - b.w) > 0.001) {
        onDraw(b);
      }
      start = null;
    }

    map.on('mousedown', onDown);
    map.on('mousemove', onMove);
    map.on('mouseup',   onUp);

    return () => {
      map.off('mousedown', onDown);
      map.off('mousemove', onMove);
      map.off('mouseup',   onUp);
      if (rect) { map.removeLayer(rect); }
      container.style.cursor = '';
      map.dragging.enable();
      map.scrollWheelZoom.enable();
    };
  }, [active, map, onDraw]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ─── Dashed rectangle tracking the live viewport ─────────────────────────────
function ViewportRect({ faded }: { faded: boolean }) {
  const [vb, setVb] = useState<Bbox | null>(null);
  const map = useMapEvents({
    moveend: () => setVb(lbToBbox(map.getBounds())),
    zoomend: () => setVb(lbToBbox(map.getBounds())),
  });
  useEffect(() => { setVb(lbToBbox(map.getBounds())); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!vb) return null;
  return (
    <Rectangle
      bounds={[[vb.s, vb.w], [vb.n, vb.e]]}
      pathOptions={faded
        ? { color: '#94a3b8', weight: 1, fillOpacity: 0.01, dashArray: '4 6', opacity: 0.35 }
        : { color: '#3b82f6', weight: 2, fillOpacity: 0.07, dashArray: '6 4' }}
    />
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function MapPanel({ onBoundsChange, onFlyToReady, drawMode, customBbox, onDraw }: Props) {
  return (
    <MapContainer center={[39.8, -98.6]} zoom={5} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <BoundsTracker onBoundsChange={onBoundsChange} />
      <FlyToController onReady={onFlyToReady} />
      <DrawController active={drawMode} onDraw={onDraw} />

      {/* Viewport outline — fades when a custom area is selected */}
      <ViewportRect faded={!!customBbox} />

      {/* Custom drawn bbox — amber */}
      {customBbox && (
        <Rectangle
          bounds={[[customBbox.s, customBbox.w], [customBbox.n, customBbox.e]]}
          pathOptions={{ color: '#f59e0b', weight: 2.5, fillOpacity: 0.12 }}
        />
      )}
    </MapContainer>
  );
}
