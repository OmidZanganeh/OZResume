'use client';
import { useEffect, useRef } from 'react';
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

function TractLayer({ state, county, tract }: { state: string; county: string; tract: string }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const url =
      `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2023/MapServer/8/query` +
      `?where=STATE+%3D+%27${state}%27+AND+COUNTY+%3D+%27${county}%27+AND+TRACT+%3D+%27${tract}%27` +
      `&outFields=STATE,COUNTY,TRACT&returnGeometry=true&f=geojson`;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then((geojson: Parameters<typeof L.geoJSON>[0]) => {
        if (controller.signal.aborted) return;
        const layer = L.geoJSON(geojson, {
          style: {
            color: '#3b82f6',
            weight: 2.5,
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
          },
        }).addTo(map);
        layerRef.current = layer;
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
      })
      .catch(() => {});

    return () => {
      controller.abort();
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [state, county, tract, map]);

  return null;
}

interface Props {
  lat: number | null;
  lon: number | null;
  onPick: (lat: number, lon: number) => void;
  tractState?: string | null;
  tractCounty?: string | null;
  tractTract?: string | null;
}

export default function CensusMap({ lat, lon, onPick, tractState, tractCounty, tractTract }: Props) {
  const hasPin   = lat !== null && lon !== null;
  const hasTract = tractState && tractCounty && tractTract;

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
      {hasTract && (
        <TractLayer state={tractState!} county={tractCounty!} tract={tractTract!} />
      )}
    </MapContainer>
  );
}
