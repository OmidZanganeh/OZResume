'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { WikiPlace } from './MapView';
import styles from './TripExplorer.module.css';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <span className={styles.mapLoadingDot} />Loading map…
    </div>
  ),
});

// ─── Category definitions ─────────────────────────────────────────────────────
interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  source: 'wiki' | 'osm' | 'local' | 'plan';
  osmTemplate?: string;
}

const CATEGORIES: Category[] = [
  { id: 'all',           label: 'All',          icon: '🌍', color: '#4f8ef7', source: 'wiki' },
  { id: 'landmarks',     label: 'Landmarks',    icon: '🏛️', color: '#6366f1', source: 'wiki' },
  { id: 'restaurants',   label: 'Eat',          icon: '🍽️', color: '#f97316', source: 'osm',  osmTemplate: 'node["amenity"="restaurant"](around:RADIUS,LAT,LON);' },
  { id: 'cafes',         label: 'Cafes',        icon: '☕', color: '#d97706', source: 'osm',  osmTemplate: 'node["amenity"~"^(cafe|coffee_shop)$"](around:RADIUS,LAT,LON);' },
  { id: 'hotels',        label: 'Stay',         icon: '🏨', color: '#a855f7', source: 'osm',  osmTemplate: 'node["tourism"~"^(hotel|hostel|guest_house|motel)$"](around:RADIUS,LAT,LON);' },
  { id: 'parks',         label: 'Nature',       icon: '🌳', color: '#22c55e', source: 'osm',  osmTemplate: 'node["leisure"~"^(park|nature_reserve|garden)$"](around:RADIUS,LAT,LON);way["leisure"~"^(park|nature_reserve|garden)$"](around:RADIUS,LAT,LON);' },
  { id: 'culture',       label: 'Culture',      icon: '🎨', color: '#ec4899', source: 'osm',  osmTemplate: 'node["tourism"~"^(museum|gallery|attraction)$"](around:RADIUS,LAT,LON);' },
  { id: 'entertainment', label: 'Fun',          icon: '🎭', color: '#f43f5e', source: 'osm',  osmTemplate: 'node["amenity"~"^(cinema|theatre|arts_centre)$"](around:RADIUS,LAT,LON);node["leisure"~"^(amusement_arcade|water_park|escape_game)$"](around:RADIUS,LAT,LON);' },
  { id: 'beach',         label: 'Beach',        icon: '🏖️', color: '#06b6d4', source: 'osm',  osmTemplate: 'node["natural"="beach"](around:RADIUS,LAT,LON);way["natural"="beach"](around:RADIUS,LAT,LON);node["leisure"="beach_resort"](around:RADIUS,LAT,LON);' },
  { id: 'nightlife',     label: 'Nightlife',    icon: '🍺', color: '#ef4444', source: 'osm',  osmTemplate: 'node["amenity"~"^(bar|pub|nightclub)$"](around:RADIUS,LAT,LON);' },
  { id: 'shopping',      label: 'Shopping',     icon: '🛍️', color: '#14b8a6', source: 'osm',  osmTemplate: 'node["shop"~"^(mall|department_store|marketplace|supermarket)$"](around:RADIUS,LAT,LON);node["amenity"="marketplace"](around:RADIUS,LAT,LON);' },
  { id: 'health',        label: 'Health',       icon: '🏥', color: '#10b981', source: 'osm',  osmTemplate: 'node["amenity"~"^(hospital|pharmacy|clinic|doctors)$"](around:RADIUS,LAT,LON);' },
  { id: 'saved',         label: 'Saved',        icon: '❤️', color: '#f43f5e', source: 'local' },
  { id: 'plan',          label: 'Trip Plan',    icon: '✈️', color: '#4f8ef7', source: 'plan' },
];

// ─── Trip plan section definitions ───────────────────────────────────────────
interface PlanSectionDef {
  id: string;
  icon: string;
  title: string;
  color: string;
  wiki: boolean;
  osmTemplate?: string;
}

const PLAN_SECTIONS: PlanSectionDef[] = [
  { id: 'landmarks',   icon: '🏛️', title: 'Top Landmarks',    color: '#6366f1', wiki: true },
  { id: 'hotels',      icon: '🏨', title: 'Where to Stay',    color: '#a855f7', wiki: false, osmTemplate: 'node["tourism"~"^(hotel|hostel|guest_house|motel)$"](around:5000,LAT,LON);' },
  { id: 'restaurants', icon: '🍽️', title: 'Where to Eat',     color: '#f97316', wiki: false, osmTemplate: 'node["amenity"="restaurant"](around:5000,LAT,LON);' },
  { id: 'culture',     icon: '🎨', title: 'Things to Do',     color: '#ec4899', wiki: false, osmTemplate: 'node["tourism"~"^(museum|gallery|attraction)$"](around:5000,LAT,LON);' },
  { id: 'parks',       icon: '🌳', title: 'Nature & Parks',   color: '#22c55e', wiki: false, osmTemplate: 'node["leisure"~"^(park|nature_reserve|garden)$"](around:5000,LAT,LON);way["leisure"~"^(park|nature_reserve|garden)$"](around:5000,LAT,LON);' },
  { id: 'cafes',       icon: '☕', title: 'Cafes & Coffee',   color: '#d97706', wiki: false, osmTemplate: 'node["amenity"~"^(cafe|coffee_shop)$"](around:5000,LAT,LON);' },
  { id: 'nightlife',   icon: '🍺', title: 'Nightlife',        color: '#ef4444', wiki: false, osmTemplate: 'node["amenity"~"^(bar|pub|nightclub)$"](around:5000,LAT,LON);' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlaceDetail {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop: { page: string } };
}

interface Weather { temp: number; code: number; wind: number; }

interface OsmElement {
  id: number;
  lat?: number; lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface PlanResult {
  sectionId: string;
  places: WikiPlace[];
  loading: boolean;
  error: boolean;
}

const RADII = [
  { label: '1 km',  value: 1000 },
  { label: '5 km',  value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function wIcon(code: number) { if (code===0) return '☀️'; if (code<=3) return '⛅'; if (code<=48) return '🌫️'; if (code<=57) return '🌦️'; if (code<=67) return '🌧️'; if (code<=77) return '❄️'; if (code<=82) return '🌦️'; return '⛈️'; }
function wLabel(code: number) { if (code===0) return 'Clear'; if (code<=3) return 'Partly cloudy'; if (code<=48) return 'Foggy'; if (code<=57) return 'Drizzle'; if (code<=67) return 'Rainy'; if (code<=77) return 'Snowy'; if (code<=82) return 'Showers'; return 'Thunderstorm'; }

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000, f1 = lat1*Math.PI/180, f2 = lat2*Math.PI/180;
  const df = (lat2-lat1)*Math.PI/180, dl = (lon2-lon1)*Math.PI/180;
  return Math.round(R*2*Math.atan2(Math.sqrt(Math.sin(df/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2), Math.sqrt(1-(Math.sin(df/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2))));
}

function fmtDist(m: number) { return m < 1000 ? `${m} m` : `${(m/1000).toFixed(1)} km`; }

// ─── API functions ─────────────────────────────────────────────────────────────
async function fetchWikiPlaces(lat: number, lon: number, radius: number, color: string, catId: string): Promise<WikiPlace[]> {
  const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=50&format=json&origin=*`);
  const data = await res.json();
  return ((data.query?.geosearch ?? []) as { pageid: number; title: string; lat: number; lon: number; dist: number }[])
    .map(p => ({ uid: `wiki:${p.pageid}`, pageid: p.pageid, title: p.title, lat: p.lat, lon: p.lon, dist: p.dist, source: 'wiki' as const, category: catId, color }));
}

async function fetchBatchThumbs(places: WikiPlace[]): Promise<Record<string, string>> {
  if (!places.length) return {};
  const titles = places.map(p => p.title).join('|');
  const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&pithumbsize=140&format=json&origin=*`);
  const data = await res.json();
  const out: Record<string, string> = {};
  for (const page of Object.values(data.query?.pages ?? {}) as { pageid: number; thumbnail?: { source: string } }[])
    if (page.thumbnail?.source) out[`wiki:${page.pageid}`] = page.thumbnail.source;
  return out;
}

async function fetchWikiSummary(title: string): Promise<PlaceDetail> {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  return res.json();
}

async function fetchOsmPlaces(lat: number, lon: number, radius: number, template: string, color: string, catId: string): Promise<WikiPlace[]> {
  const inner = template.replace(/RADIUS/g, String(radius)).replace(/LAT/g, String(lat)).replace(/LON/g, String(lon));
  const query = `[out:json][timeout:20];(${inner});out body center 50;`;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 22000);
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, { signal: ctrl.signal });
    const data = await res.json();
    return ((data.elements ?? []) as OsmElement[])
      .filter(e => (e.lat ?? e.center?.lat) != null && e.tags?.name)
      .map(e => {
        const eLat = e.lat ?? e.center!.lat, eLon = e.lon ?? e.center!.lon;
        return { uid: `osm:${e.id}`, pageid: e.id, title: e.tags!.name!, lat: eLat, lon: eLon, dist: haversineM(lat, lon, eLat, eLon), source: 'osm' as const, category: catId, color, osmTags: e.tags };
      })
      .sort((a, b) => a.dist - b.dist);
  } finally { clearTimeout(tid); }
}

async function fetchWeather(lat: number, lon: number): Promise<Weather | null> {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`);
    const d = await res.json();
    const c = d.current;
    return c ? { temp: Math.round(c.temperature_2m), code: c.weather_code, wind: Math.round(c.wind_speed_10m) } : null;
  } catch { return null; }
}

// ─── Favorites ────────────────────────────────────────────────────────────────
const FAV_KEY = 'discover_favorites_v1';
function loadFavs(): WikiPlace[] { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } }
function saveFavs(f: WikiPlace[]) { localStorage.setItem(FAV_KEY, JSON.stringify(f)); }

// ─── Component ────────────────────────────────────────────────────────────────
export default function TripExplorer() {
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]);
  const [mapZoom, setMapZoom] = useState(13);
  const [places, setPlaces] = useState<WikiPlace[]>([]);
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<WikiPlace | null>(null);
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [favorites, setFavorites] = useState<WikiPlace[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [radius, setRadius] = useState(5000);
  const [discovering, setDiscovering] = useState(false);
  const [searching, setSearching] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [osmError, setOsmError] = useState(false);
  // Trip planner
  const [planCityQ, setPlanCityQ] = useState('');
  const [planResults, setPlanResults] = useState<PlanResult[]>([]);
  const [planning, setPlanning] = useState(false);
  const [planCity, setPlanCity] = useState('');

  const currentCenter = useRef<[number, number]>(mapCenter);

  useEffect(() => {
    setFavorites(loadFavs());
    try {
      const p = new URLSearchParams(window.location.search);
      const lat = parseFloat(p.get('lat') || ''), lon = parseFloat(p.get('lon') || '');
      if (!isNaN(lat) && !isNaN(lon)) { setMapCenter([lat, lon]); setMapZoom(parseInt(p.get('z') || '14', 10)); }
    } catch { /* ignore */ }
  }, []);

  const getCat = useCallback((id: string) => CATEGORIES.find(c => c.id === id)!, []);
  const isFav = useCallback((uid: string) => favorites.some(f => f.uid === uid), [favorites]);

  const toggleFav = useCallback((place: WikiPlace) => {
    setFavorites(prev => {
      const next = prev.some(f => f.uid === place.uid) ? prev.filter(f => f.uid !== place.uid) : [...prev, place];
      saveFavs(next);
      return next;
    });
  }, []);

  const discover = useCallback(async (lat: number, lon: number, rad: number, catId: string) => {
    const cat = getCat(catId);
    if (!cat || cat.source === 'local' || cat.source === 'plan') return;
    setDiscovering(true); setSelected(null); setDetail(null); setOsmError(false);
    try {
      let raw: WikiPlace[] = [];
      if (cat.source === 'wiki') {
        raw = await fetchWikiPlaces(lat, lon, rad, cat.color, catId);
        const thumbs = await fetchBatchThumbs(raw);
        raw = raw.map(p => ({ ...p, thumbnail: thumbs[p.uid] }));
      } else if (cat.source === 'osm' && cat.osmTemplate) {
        raw = await fetchOsmPlaces(lat, lon, rad, cat.osmTemplate, cat.color, catId);
      }
      setPlaces(raw);
    } catch { setOsmError(true); setPlaces([]); }
    finally { setDiscovering(false); }
    fetchWeather(lat, lon).then(w => { if (w) setWeather(w); });
  }, [getCat]);

  const handleDiscover = useCallback(() => discover(mapCenter[0], mapCenter[1], radius, category), [mapCenter, radius, category, discover]);

  const handleCategoryChange = useCallback((catId: string) => {
    setCategory(catId);
    setSelected(null);
    setDetail(null);
    if (catId === 'plan' || catId === 'saved') { if (catId === 'plan') setPlaces([]); return; }
    discover(mapCenter[0], mapCenter[1], radius, catId);
  }, [mapCenter, radius, discover]);

  const handlePlaceClick = useCallback(async (place: WikiPlace) => {
    setSelected(place);
    setDetail(null);
    if (place.source === 'wiki') {
      setDetailLoading(true);
      try { setDetail(await fetchWikiSummary(place.title)); }
      catch { /* silent */ }
      finally { setDetailLoading(false); }
    }
  }, []);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQ)}&format=json&limit=1`);
      const data = await res.json();
      if (data[0]) {
        const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon);
        setMapCenter([lat, lon]); setMapZoom(13);
        if (category !== 'saved' && category !== 'plan') await discover(lat, lon, radius, category);
      }
    } catch { /* silent */ }
    finally { setSearching(false); }
  }, [searchQ, radius, category, discover]);

  const goToLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { const { latitude: lat, longitude: lon } = pos.coords; setUserLocation([lat, lon]); setMapCenter([lat, lon]); setMapZoom(15); setLocating(false); },
      () => setLocating(false),
    );
  }, []);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setUserLocation([lat, lon]); setMapCenter([lat, lon]); setMapZoom(14);
        if (category !== 'saved' && category !== 'plan') await discover(lat, lon, radius, category);
        setLocating(false);
      },
      () => setLocating(false),
    );
  }, [radius, category, discover]);

  const handleMapMoveEnd = useCallback((lat: number, lon: number) => { currentCenter.current = [lat, lon]; }, []);

  const handleRadiusChange = useCallback((r: number) => {
    setRadius(r);
    if (places.length > 0 && category !== 'saved' && category !== 'plan') discover(mapCenter[0], mapCenter[1], r, category);
  }, [places.length, mapCenter, category, discover]);

  const handleShare = useCallback(() => {
    if (!selected) return;
    const url = `${window.location.origin}/tools/trip-explorer?lat=${selected.lat}&lon=${selected.lon}&z=15`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [selected]);

  const openDirections = useCallback((lat: number, lon: number) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.open(isIOS ? `maps://maps.apple.com/?daddr=${lat},${lon}` : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
  }, []);

  // ── Trip Planner ────────────────────────────────────────────────────────────
  const handlePlanSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planCityQ.trim()) return;
    setPlanning(true);
    setPlanCity(planCityQ);
    setPlanResults(PLAN_SECTIONS.map(s => ({ sectionId: s.id, places: [], loading: true, error: false })));
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(planCityQ)}&format=json&limit=1`);
      const geoData = await geoRes.json();
      if (!geoData[0]) throw new Error('City not found');
      const lat = parseFloat(geoData[0].lat), lon = parseFloat(geoData[0].lon);
      setMapCenter([lat, lon]); setMapZoom(13);
      fetchWeather(lat, lon).then(w => { if (w) setWeather(w); });

      await Promise.allSettled(PLAN_SECTIONS.map(async section => {
        try {
          let raw: WikiPlace[] = [];
          if (section.wiki) {
            raw = await fetchWikiPlaces(lat, lon, 5000, section.color, section.id);
            const thumbs = await fetchBatchThumbs(raw);
            raw = raw.map(p => ({ ...p, thumbnail: thumbs[p.uid] })).slice(0, 6);
          } else if (section.osmTemplate) {
            const tmpl = section.osmTemplate.replace(/5000/g, '5000');
            raw = (await fetchOsmPlaces(lat, lon, 5000, tmpl, section.color, section.id)).slice(0, 6);
          }
          setPlanResults(prev => prev.map(r => r.sectionId === section.id ? { ...r, places: raw, loading: false } : r));
        } catch {
          setPlanResults(prev => prev.map(r => r.sectionId === section.id ? { ...r, loading: false, error: true } : r));
        }
      }));
    } catch { setPlanResults([]); }
    finally { setPlanning(false); }
  }, [planCityQ]);

  const mapPlaces = useMemo(() => {
    if (category === 'plan') return planResults.flatMap(r => r.places);
    if (category === 'saved') return favorites;
    return places;
  }, [category, places, favorites, planResults]);

  const activeList = category === 'saved' ? favorites : places;

  const renderDetail = () => (
    <div className={styles.detailPanel}>
      <button type="button" className={styles.backBtn} onClick={() => { setSelected(null); setDetail(null); }}>← Back</button>

      {selected?.source === 'osm' && selected.osmTags && (
        <div className={styles.detailContent}>
          <div className={styles.osmHeader}>
            <span className={styles.osmCatChip} style={{ background: getCat(selected.category)?.color + '22', color: getCat(selected.category)?.color, borderColor: getCat(selected.category)?.color + '44' }}>
              {getCat(selected.category)?.icon} {getCat(selected.category)?.label}
            </span>
            <h2 className={styles.detailTitle} style={{ margin: 0 }}>{selected.title}</h2>
            <span className={styles.detailDist}>📍 {fmtDist(selected.dist)} away</span>
          </div>
          <div className={styles.osmMeta}>
            {selected.osmTags.cuisine && <div className={styles.osmRow}><span className={styles.osmKey}>Cuisine</span><span>{selected.osmTags.cuisine.replace(/_/g, ' ')}</span></div>}
            {selected.osmTags.opening_hours && <div className={styles.osmRow}><span className={styles.osmKey}>Hours</span><span className={styles.osmHours}>{selected.osmTags.opening_hours}</span></div>}
            {(selected.osmTags['addr:street'] || selected.osmTags['addr:housenumber']) && <div className={styles.osmRow}><span className={styles.osmKey}>Address</span><span>{[selected.osmTags['addr:housenumber'], selected.osmTags['addr:street'], selected.osmTags['addr:city']].filter(Boolean).join(', ')}</span></div>}
            {(selected.osmTags.phone || selected.osmTags['contact:phone']) && <div className={styles.osmRow}><span className={styles.osmKey}>Phone</span><a href={`tel:${selected.osmTags.phone || selected.osmTags['contact:phone']}`} className={styles.osmLink}>{selected.osmTags.phone || selected.osmTags['contact:phone']}</a></div>}
            {(selected.osmTags.website || selected.osmTags['contact:website']) && <div className={styles.osmRow}><span className={styles.osmKey}>Website</span><a href={selected.osmTags.website || selected.osmTags['contact:website']} target="_blank" rel="noopener noreferrer" className={styles.osmLink}>{(selected.osmTags.website || selected.osmTags['contact:website'] || '').replace(/^https?:\/\/(www\.)?/, '').substring(0, 35)}</a></div>}
            {selected.osmTags.stars && <div className={styles.osmRow}><span className={styles.osmKey}>Stars</span><span>{'⭐'.repeat(Math.min(5, parseInt(selected.osmTags.stars)))}</span></div>}
          </div>
          <div className={styles.detailActions}>
            <button type="button" className={styles.actionBtn} onClick={() => openDirections(selected.lat, selected.lon)}>🗺️ Directions</button>
            <a href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lon}`} target="_blank" rel="noopener noreferrer" className={styles.actionBtnOutline}>Google Maps</a>
            <button type="button" className={`${styles.actionBtnOutline} ${isFav(selected.uid) ? styles.actionBtnFav : ''}`} onClick={() => toggleFav(selected)}>{isFav(selected.uid) ? '❤️ Saved' : '🤍 Save'}</button>
            <button type="button" className={styles.actionBtnOutline} onClick={handleShare}>{copied ? '✓ Copied!' : '🔗 Share'}</button>
          </div>
        </div>
      )}

      {selected?.source === 'wiki' && (
        <>
          {detailLoading ? (
            <div className={styles.detailSkeleton}>
              <div className={styles.skeletonImg} /><div className={styles.skeletonLine} /><div className={styles.skeletonLine} style={{ width: '80%' }} /><div className={styles.skeletonLine} style={{ width: '60%' }} />
            </div>
          ) : detail ? (
            <div className={styles.detailContent}>
              {detail.thumbnail && <img src={detail.thumbnail.source} alt={detail.title} className={styles.detailImg} />}
              <h2 className={styles.detailTitle}>{detail.title}</h2>
              <span className={styles.detailDist}>📍 {fmtDist(selected.dist)} away</span>
              <p className={styles.detailExtract}>{detail.extract}</p>
              <div className={styles.detailActions}>
                {detail.content_urls && <a href={detail.content_urls.desktop.page} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}>📖 Wikipedia</a>}
                <button type="button" className={styles.actionBtnOutline} onClick={() => openDirections(selected.lat, selected.lon)}>🗺️ Directions</button>
                <button type="button" className={`${styles.actionBtnOutline} ${isFav(selected.uid) ? styles.actionBtnFav : ''}`} onClick={() => toggleFav(selected)}>{isFav(selected.uid) ? '❤️ Saved' : '🤍 Save'}</button>
                <button type="button" className={styles.actionBtnOutline} onClick={handleShare}>{copied ? '✓ Copied!' : '🔗 Share'}</button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );

  const renderPlaceCard = (place: WikiPlace) => (
    <button type="button" key={place.uid} className={styles.placeCard} onClick={() => handlePlaceClick(place)}>
      {place.thumbnail
        ? <img src={place.thumbnail} alt="" className={styles.cardThumb} aria-hidden="true" />
        : <div className={styles.cardThumbFallback} style={{ background: place.color + '22' }}><span style={{ fontSize: 20 }}>{getCat(place.category)?.icon ?? '📍'}</span></div>
      }
      <div className={styles.cardInfo}>
        <span className={styles.cardTitle}>{place.title}</span>
        <div className={styles.cardMeta}>
          {place.osmTags?.cuisine && <span className={styles.cardTag}>{place.osmTags.cuisine.split(';')[0].replace(/_/g, ' ')}</span>}
          {place.osmTags?.stars && <span className={styles.cardTag}>{'⭐'.repeat(Math.min(5, parseInt(place.osmTags.stars)))}</span>}
          <span className={styles.cardDist}>{fmtDist(place.dist)}</span>
        </div>
      </div>
      <svg className={styles.cardChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  );

  return (
    <div className={styles.root}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.logoWrap}>
          <Link href="/tools" className={styles.backLink} title="Back to Tools">←</Link>
          <span className={styles.logoIcon}>🧭</span>
          <span className={styles.logoText}>Discover</span>
        </div>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <input className={styles.searchInput} type="text" placeholder="Search city, landmark, country…" value={searchQ} onChange={e => setSearchQ(e.target.value)} aria-label="Search location" />
          <button type="submit" className={styles.searchBtn} disabled={searching} aria-label="Search">
            {searching ? <span className={styles.spinner} /> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
          </button>
        </form>

        <button type="button" className={styles.nearMeBtn} onClick={handleNearMe} disabled={locating} title="Go to my location and discover">
          {locating ? <span className={styles.spinner} /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>}
          <span className={styles.nearMeLabel}>Near me</span>
        </button>
      </header>

      {/* ── Category pills ── */}
      <div className={styles.categoryRow}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} type="button"
            className={`${styles.catBtn} ${category === cat.id ? styles.catBtnActive : ''} ${cat.id === 'plan' ? styles.catBtnPlan : ''}`}
            style={category === cat.id ? { '--cat-color': cat.color } as React.CSSProperties : undefined}
            onClick={() => handleCategoryChange(cat.id)}
          >
            <span className={styles.catIcon}>{cat.icon}</span>
            <span className={styles.catLabel}>{cat.label}</span>
            {cat.id === 'saved' && favorites.length > 0 && <span className={styles.catCount}>{favorites.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Controls + weather ── */}
      <div className={styles.controls}>
        <span className={styles.controlLabel}>Radius</span>
        {RADII.map(r => (
          <button key={r.value} type="button" className={`${styles.radiusBtn} ${radius === r.value ? styles.radiusBtnActive : ''}`} onClick={() => handleRadiusChange(r.value)}>{r.label}</button>
        ))}
        {category !== 'saved' && category !== 'plan' && (
          <button type="button" className={styles.discoverBtn} onClick={handleDiscover} disabled={discovering}>
            {discovering ? <><span className={styles.spinner} /> Searching…</> : <>✦ Discover here</>}
          </button>
        )}
        {category !== 'plan' && activeList.length > 0 && !discovering && <span className={styles.countBadge}>{activeList.length}</span>}
        {weather && <span className={styles.weatherChip} title={`${wLabel(weather.code)} · Wind ${weather.wind} km/h`}>{wIcon(weather.code)} {weather.temp}°C</span>}
      </div>

      {/* ── Main ── */}
      <div className={styles.main}>

        {/* Map */}
        <div className={styles.mapWrap}>
          <MapView
            center={mapCenter}
            zoom={mapZoom}
            places={mapPlaces}
            selectedUid={selected?.uid ?? null}
            userLocation={userLocation}
            onPlaceClick={handlePlaceClick}
            onMapMoveEnd={handleMapMoveEnd}
          />
          <button type="button" className={styles.locateFloatBtn} onClick={goToLocation} title="Show my location on map" aria-label="Show my location">
            {locating ? <span className={styles.spinnerDark} /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>}
          </button>
          {mapPlaces.length === 0 && !discovering && category !== 'saved' && category !== 'plan' && (
            <div className={styles.mapHint}>Select a category and click <strong>Discover here</strong> to find places</div>
          )}
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>

          {/* Detail panel (shared across all modes) */}
          {selected && renderDetail()}

          {/* Trip Planner */}
          {!selected && category === 'plan' && (
            <div className={styles.planContent}>
              <div className={styles.planHeader}>
                <span className={styles.planHeaderTitle}>✈️ Trip Planner</span>
                <span className={styles.planHeaderSub}>Enter a destination and get a full guide</span>
              </div>
              <form className={styles.planForm} onSubmit={handlePlanSearch}>
                <input className={styles.planInput} type="text" placeholder="City, country or destination…" value={planCityQ} onChange={e => setPlanCityQ(e.target.value)} />
                <button type="submit" className={styles.planBtn} disabled={planning}>
                  {planning ? <><span className={styles.spinner} /> Planning…</> : <>✈️ Plan My Trip</>}
                </button>
              </form>

              {planCity && weather && (
                <div className={styles.planWeatherBanner}>
                  {wIcon(weather.code)} <strong>{planCity}</strong> — {weather.temp}°C · {wLabel(weather.code)} · Wind {weather.wind} km/h
                </div>
              )}

              {planResults.length === 0 && !planning && (
                <div className={styles.planEmpty}>
                  <div className={styles.planEmptyIcon}>🗺️</div>
                  <p>Enter a destination above to get your personalized travel guide with accommodation, dining, sightseeing and more.</p>
                </div>
              )}

              {planResults.map(result => {
                const def = PLAN_SECTIONS.find(s => s.id === result.sectionId)!;
                return (
                  <div key={result.sectionId} className={styles.planSection}>
                    <div className={styles.planSectionHeader} style={{ borderLeftColor: def.color }}>
                      <span className={styles.planSectionIcon}>{def.icon}</span>
                      <span className={styles.planSectionTitle}>{def.title}</span>
                      {result.loading && <span className={styles.spinner} style={{ marginLeft: 'auto' }} />}
                      {!result.loading && result.places.length > 0 && <span className={styles.planSectionCount} style={{ background: def.color + '22', color: def.color }}>{result.places.length}</span>}
                    </div>
                    {result.loading && (
                      <div className={styles.planSkeletons}>
                        {[1,2,3].map(i => <div key={i} className={styles.planSkeleton} />)}
                      </div>
                    )}
                    {!result.loading && result.error && (
                      <div className={styles.planSectionError}>Could not load data for this section</div>
                    )}
                    {!result.loading && result.places.map(place => (
                      <button key={place.uid} type="button" className={styles.planPlaceRow} onClick={() => handlePlaceClick(place)}>
                        {place.thumbnail
                          ? <img src={place.thumbnail} alt="" className={styles.planThumb} aria-hidden="true" />
                          : <div className={styles.planThumbFallback} style={{ background: def.color + '22', color: def.color }}>{def.icon}</div>
                        }
                        <div className={styles.planPlaceInfo}>
                          <span className={styles.planPlaceName}>{place.title}</span>
                          <span className={styles.planPlaceDist}>{fmtDist(place.dist)}</span>
                        </div>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'rgba(255,255,255,0.2)' }}><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Saved places */}
          {!selected && category === 'saved' && (
            <div className={styles.placesList}>
              {favorites.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>❤️</div>
                  <p className={styles.emptyTitle}>No saved places yet</p>
                  <p className={styles.emptyDesc}>Open any place and tap <strong>Save</strong> to bookmark it here.</p>
                </div>
              ) : favorites.map(renderPlaceCard)}
            </div>
          )}

          {/* Regular place list */}
          {!selected && category !== 'plan' && category !== 'saved' && (
            <div className={styles.placesList}>
              {osmError && <div className={styles.osmError}>⚠️ OpenStreetMap data is slow to respond. Try again or reduce the radius.</div>}
              {activeList.length === 0 && !discovering ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>{getCat(category)?.icon}</div>
                  <p className={styles.emptyTitle}>Ready to explore</p>
                  <p className={styles.emptyDesc}>Pan the map to your destination, then hit <strong>Discover here</strong>.</p>
                </div>
              ) : activeList.map(renderPlaceCard)}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
