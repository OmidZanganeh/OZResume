'use client';
import { useState } from 'react';
import {
  Car, PersonStanding, Bike, Play, Download,
  Search, Crosshair, ChevronDown, ChevronRight, MapPin, Info,
} from 'lucide-react';
import styles from './TripExplorer.module.css';

// ── Types & constants ─────────────────────────────────────────────────────────
export type IsoCosting = 'auto' | 'pedestrian' | 'bicycle';

export const ISO_RING_COLORS = ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6'];
export const ISO_ALL_TIMES   = [10, 15, 20, 30, 45, 60];

export interface IsoPOI {
  id: number; lat: number; lon: number;
  name: string; tags: Record<string, string>; icon: string;
}

interface PoiCat { id: string; icon: string; label: string; key: string; val: string }
export const ISO_POI_CATS: PoiCat[] = [
  { id: 'restaurant',  icon: '🍽️', label: 'Restaurants',  key: 'amenity', val: 'restaurant'       },
  { id: 'cafe',        icon: '☕',  label: 'Cafes',         key: 'amenity', val: 'cafe'             },
  { id: 'fuel',        icon: '⛽',  label: 'Gas Stations',  key: 'amenity', val: 'fuel'             },
  { id: 'supermarket', icon: '🛒',  label: 'Supermarkets',  key: 'shop',    val: 'supermarket'      },
  { id: 'pharmacy',    icon: '💊',  label: 'Pharmacies',    key: 'amenity', val: 'pharmacy'         },
  { id: 'hospital',    icon: '🏥',  label: 'Hospitals',     key: 'amenity', val: 'hospital'         },
  { id: 'bank',        icon: '🏦',  label: 'Banks / ATMs',  key: 'amenity', val: 'bank'             },
  { id: 'park',        icon: '🌳',  label: 'Parks',         key: 'leisure', val: 'park'             },
  { id: 'hotel',       icon: '🏨',  label: 'Hotels',        key: 'tourism', val: 'hotel'            },
  { id: 'charging',    icon: '⚡',  label: 'EV Chargers',   key: 'amenity', val: 'charging_station' },
  { id: 'gym',         icon: '🏋️', label: 'Gyms',           key: 'leisure', val: 'fitness_centre'   },
  { id: 'fast_food',   icon: '🍔',  label: 'Fast Food',     key: 'amenity', val: 'fast_food'        },
];

const MODES: { value: IsoCosting; label: string; Icon: React.ElementType }[] = [
  { value: 'auto',       label: 'Driving', Icon: Car             },
  { value: 'pedestrian', label: 'Walking', Icon: PersonStanding  },
  { value: 'bicycle',    label: 'Cycling', Icon: Bike            },
];

// ── Overpass helpers ──────────────────────────────────────────────────────────
interface GeoJSONFeature {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown[] };
}

export function extractPolyString(
  geojson: Record<string, unknown>,
  ringMinutes: number,
  maxPts = 100,
): string | null {
  const features = geojson.features as GeoJSONFeature[];
  const feat = features.find(f => f.properties?.contour === ringMinutes);
  if (!feat) return null;
  let coords: [number, number][] = [];
  const geom = feat.geometry;
  if (geom.type === 'Polygon') coords = geom.coordinates[0] as [number, number][];
  else if (geom.type === 'MultiPolygon') coords = (geom.coordinates[0] as [number, number][][])[0];
  if (!coords.length) return null;
  const step = Math.max(1, Math.ceil(coords.length / maxPts));
  return coords.filter((_, i) => i % step === 0)
    .map(([lon, lat]) => `${lat.toFixed(5)} ${lon.toFixed(5)}`).join(' ');
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number; lat?: number; lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function processOverpassResult(elements: OverpassElement[], cat: PoiCat): IsoPOI[] {
  return elements.map(e => {
    const lat = e.type === 'node' ? e.lat : e.center?.lat;
    const lon = e.type === 'node' ? e.lon : e.center?.lon;
    if (lat == null || lon == null) return null;
    return { id: e.id, lat, lon, name: e.tags?.name ?? 'Unnamed', tags: e.tags ?? {}, icon: cat.icon };
  }).filter((p): p is IsoPOI => p !== null).slice(0, 80);
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  origin: [number, number] | null;
  costing: IsoCosting;
  times: number[];
  geojson: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  pois: IsoPOI[];
  poisLoading: boolean;
  poisError: string | null;
  activePoi: number | null;
  locating: boolean;
  onCostingChange: (c: IsoCosting) => void;
  onTimesToggle: (t: number) => void;
  onGenerate: () => void;
  onDownload: () => void;
  onFindPois: (catId: string, ringTime: number) => void;
  onActivePoi: (id: number | null) => void;
  onLocateMe: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function IsoPanel({
  origin, costing, times, geojson, loading, error,
  pois, poisLoading, poisError, activePoi, locating,
  onCostingChange, onTimesToggle, onGenerate, onDownload,
  onFindPois, onActivePoi, onLocateMe,
}: Props) {
  const [selCat, setSelCat]     = useState('restaurant');
  const [poiRing, setPoiRing]   = useState<number | null>(null);
  const [poisOpen, setPoisOpen] = useState(true);

  const sortedTimes = [...times].sort((a, b) => a - b);
  const ringTime   = poiRing ?? sortedTimes[0] ?? null;
  const activeCat  = ISO_POI_CATS.find(c => c.id === selCat);
  const modeLabel  = MODES.find(m => m.value === costing)?.label.toLowerCase() ?? 'travel';

  return (
    <div className={styles.isoPanel}>

      {/* Click hint */}
      {!origin && (
        <div className={styles.isoHint}>
          <MapPin size={14} />
          <span>Click anywhere on the map to set an origin point</span>
        </div>
      )}

      {/* Travel mode */}
      <div className={styles.isoPanelBlock}>
        <span className={styles.sectionLabel}>Travel Mode</span>
        <div className={styles.isoModeRow}>
          {MODES.map(({ value, label, Icon }) => (
            <button
              key={value} type="button"
              className={`${styles.isoModeBtn} ${costing === value ? styles.isoModeBtnActive : ''}`}
              onClick={() => onCostingChange(value)}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Time rings */}
      <div className={styles.isoPanelBlock}>
        <span className={styles.sectionLabel}>Time Rings</span>
        <div className={styles.isoTimeGrid}>
          {ISO_ALL_TIMES.map(t => (
            <button
              key={t} type="button"
              className={`${styles.isoTimeChip} ${times.includes(t) ? styles.isoTimeChipActive : ''}`}
              onClick={() => onTimesToggle(t)}
            >
              {t}m
            </button>
          ))}
        </div>
      </div>

      {/* Origin display + locate me */}
      <div className={styles.isoPanelBlock}>
        {origin && (
          <span className={styles.isoOriginVal}>
            <MapPin size={11} /> {origin[0].toFixed(4)}, {origin[1].toFixed(4)}
          </span>
        )}
        <button type="button" className={styles.isoLocateBtn} onClick={onLocateMe} disabled={locating}>
          {locating ? <span className={styles.spinner} /> : <Crosshair size={13} />}
          Use my location
        </button>
      </div>

      {/* Generate */}
      <div className={styles.isoPanelBlock}>
        <button
          type="button" className={styles.discoverBtn}
          onClick={onGenerate}
          disabled={!origin || times.length === 0 || loading}
        >
          {loading
            ? <><span className={styles.spinner} /> Generating…</>
            : <><Play size={13} /> Generate travel zones</>
          }
        </button>
      </div>

      {error && (
        <div className={styles.osmError}><Info size={13} /><span>{error}</span></div>
      )}

      {/* Legend + download */}
      {geojson && !loading && (
        <>
          <div className={styles.isoPanelBlock}>
            <span className={styles.sectionLabel}>Legend</span>
            {sortedTimes.map((t, i) => (
              <div key={t} className={styles.isoLegendRow}>
                <span className={styles.isoLegendSwatch} style={{ background: ISO_RING_COLORS[i % ISO_RING_COLORS.length] }} />
                <span className={styles.isoLegendText}>{t} min {modeLabel}</span>
              </div>
            ))}
          </div>
          <div className={styles.isoPanelBlock} style={{ paddingTop: 0 }}>
            <button type="button" className={`${styles.actionBtnOutline} ${styles.isoFullBtn}`} onClick={onDownload}>
              <Download size={12} /> Download GeoJSON
            </button>
          </div>

          {/* POI finder */}
          <div className={styles.isoPoiSection}>
            <button
              type="button" className={styles.wikiSectionHead}
              style={{ borderLeftColor: '#6366f1' }}
              onClick={() => setPoisOpen(v => !v)}
            >
              <Search size={13} style={{ color: '#6366f1', flexShrink: 0 }} />
              <span className={styles.wikiSectionTitle} style={{ color: '#6366f1' }}>Find Places Nearby</span>
              <ChevronDown size={13} className={poisOpen ? styles.chevronOpen : styles.chevronClosed} style={{ marginLeft: 'auto' }} />
            </button>

            {poisOpen && (
              <div className={styles.isoPoiContent}>
                {/* Category icons */}
                <div className={styles.isoCatGrid}>
                  {ISO_POI_CATS.map(cat => (
                    <button
                      key={cat.id} type="button"
                      className={`${styles.isoCatBtn} ${selCat === cat.id ? styles.isoCatBtnActive : ''}`}
                      onClick={() => setSelCat(cat.id)} title={cat.label}
                    >
                      {cat.icon}
                    </button>
                  ))}
                </div>

                {/* Ring picker */}
                <div className={styles.isoRingRow}>
                  <span className={styles.sectionLabel}>Within</span>
                  <div className={styles.radiusBtns}>
                    {sortedTimes.map(t => (
                      <button
                        key={t} type="button"
                        className={`${styles.radiusBtn} ${ringTime === t ? styles.radiusBtnActive : ''}`}
                        onClick={() => setPoiRing(t)}
                      >
                        {t}m
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button" className={styles.discoverBtn}
                  onClick={() => ringTime && onFindPois(selCat, ringTime)}
                  disabled={poisLoading || !ringTime}
                >
                  {poisLoading
                    ? <><span className={styles.spinner} /> Searching…</>
                    : <><Search size={13} /> Find {activeCat?.label} in {ringTime}m</>
                  }
                </button>

                {poisError && (
                  <div className={styles.osmError}><Info size={13} /><span>{poisError}</span></div>
                )}

                {pois.length > 0 && (
                  <div className={styles.isoPoiList}>
                    <span className={styles.sortLabel}>{pois.length} {activeCat?.label} found</span>
                    {pois.map(poi => (
                      <div
                        key={poi.id}
                        className={`${styles.placeCard} ${activePoi === poi.id ? styles.isoPoiCardActive : ''}`}
                        onMouseEnter={() => onActivePoi(poi.id)}
                        onMouseLeave={() => onActivePoi(null)}
                      >
                        <div className={styles.cardThumbFallback} style={{ background: 'rgba(99,102,241,0.12)' }}>
                          <span style={{ fontSize: 17 }}>{poi.icon}</span>
                        </div>
                        <div className={styles.cardInfo}>
                          <span className={styles.cardTitle}>{poi.name}</span>
                          <div className={styles.cardMeta}>
                            {poi.tags.cuisine && (
                              <span className={styles.cardTag}>{poi.tags.cuisine.split(';')[0].replace(/_/g, ' ')}</span>
                            )}
                          </div>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lon}`}
                          target="_blank" rel="noreferrer"
                          className={styles.cardChevron} style={{ color: '#4f8ef7' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <ChevronRight size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
