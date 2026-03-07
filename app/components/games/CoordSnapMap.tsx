'use client';
import { useContext } from 'react';
import { ComposableMap, Geographies, Geography, Marker, MapContext } from 'react-simple-maps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface MarkerData {
  coords: [number, number];
  correct: boolean;
}

interface Props {
  onMapClick: (lng: number, lat: number) => void;
  markers: MarkerData[];
  targetCoords: [number, number] | null;
  disabled: boolean;
}

/** Inner component so we can access the map projection via useMapContext. */
function MapClickHandler({ onMapClick, disabled }: { onMapClick: (lng: number, lat: number) => void; disabled: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { projection } = useContext(MapContext) as any;

  const handleClick = (e: React.MouseEvent<SVGRectElement>) => {
    if (disabled) return;
    const svg = e.currentTarget.closest('svg') as SVGSVGElement;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;

    // Convert CSS pixels → SVG viewBox units, then invert through the d3 projection
    const svgX = ((e.clientX - rect.left) / rect.width) * (vb.width || rect.width);
    const svgY = ((e.clientY - rect.top) / rect.height) * (vb.height || rect.height);

    const coords = projection.invert?.([svgX, svgY]);
    if (coords && isFinite(coords[0]) && isFinite(coords[1])) {
      onMapClick(coords[0], coords[1]);
    }
  };

  return (
    <rect
      x={0}
      y={0}
      width="100%"
      height="100%"
      fill="transparent"
      onClick={handleClick}
      style={{ cursor: disabled ? 'default' : 'crosshair' }}
    />
  );
}

export default function CoordSnapMap({ onMapClick, markers, targetCoords, disabled }: Props) {
  return (
    <ComposableMap
      projection="geoEquirectangular"
      style={{ width: '100%', height: 'auto' }}
    >
      <MapClickHandler onMapClick={onMapClick} disabled={disabled} />

      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map(geo => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              style={{
                default: { fill: 'var(--paper-dark)', stroke: 'var(--border-light)', strokeWidth: 0.3, outline: 'none' },
                hover:   { fill: 'var(--paper-dark)', stroke: 'var(--border-light)', strokeWidth: 0.3, outline: 'none' },
                pressed: { fill: 'var(--paper-dark)', stroke: 'var(--border-light)', strokeWidth: 0.3, outline: 'none' },
              }}
            />
          ))
        }
      </Geographies>

      {targetCoords && (
        <Marker coordinates={targetCoords}>
          <circle r={5} fill="#16a34a" stroke="white" strokeWidth={1.5} />
        </Marker>
      )}

      {markers.map((m, i) => (
        <Marker key={i} coordinates={m.coords}>
          <circle r={4} fill={m.correct ? '#16a34a' : '#dc2626'} stroke="white" strokeWidth={1} />
        </Marker>
      ))}
    </ComposableMap>
  );
}
