'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useCallback, useEffect, useRef } from 'react';
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
  source: 'wiki' | 'osm' | 'local';
  osmTemplate?: string;
}

const CATEGORIES: Category[] = [
  { id: 'all',        label: 'All',       icon: '🌍', color: '#4f8ef7', source: 'wiki' },
  { id: 'landmarks',  label: 'Landmarks', icon: '🏛️', color: '#6366f1', source: 'wiki' },
  { id: 'restaurants',label: 'Eat',       icon: '🍽️', color: '#f97316', source: 'osm', osmTemplate: 'node["amenity"="restaurant"](around:RADIUS,LAT,LON);' },
  { id: 'cafes',      label: 'Cafes',     icon: '☕', color: '#d97706', source: 'osm', osmTemplate: 'node["amenity"~"^(cafe|coffee_shop)$"](around:RADIUS,LAT,LON);' },
  { id: 'hotels',     label: 'Stay',      icon: '🏨', color: '#a855f7', source: 'osm', osmTemplate: 'node["tourism"~"^(hotel|hostel|guest_house|motel)$"](around:RADIUS,LAT,LON);' },
  { id: 'parks',      label: 'Nature',    icon: '🌳', color: '#22c55e', source: 'osm', osmTemplate: 'node["leisure"~"^(park|nature_reserve|garden)$"](around:RADIUS,LAT,LON);way["leisure"~"^(park|nature_reserve|garden)$"](around:RADIUS,LAT,LON);' },
  { id: 'culture',    label: 'Culture',   icon: '🎨', color: '#ec4899', source: 'osm', osmTemplate: 'node["tourism"~"^(museum|gallery|attraction)$"](around:RADIUS,LAT,LON);' },
  { id: 'nightlife',  label: 'Nightlife', icon: '🍺', color: '#ef4444', source: 'osm', osmTemplate: 'node["amenity"~"^(bar|pub|nightclub)$"](around:RADIUS,LAT,LON);' },
  { id: 'shopping',   label: 'Shopping',  icon: '🛍️', color: '#14b8a6', source: 'osm', osmTemplate: 'node["shop"~"^(mall|department_store|marketplace|supermarket)$"](around:RADIUS,LAT,LON);node["amenity"="marketplace"](around:RADIUS,LAT,LON);' },
  { id: 'saved',      label: 'Saved',     icon: '❤️', color: '#f43f5e', source: 'local' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlaceDetail {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop: { page: string } };
}

interface Weather {
  temp: number;
  code: number;
  wind: number;
}

interface OsmElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const RADII = [
  { label: '1 km',  value: 1000 },
  { label: '5 km',  value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
];

// ─── Weather helpers ──────────────────────────────────────────────────────────
function wIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}
function wLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Showers';
  return 'Thunderstorm';
}

// ─── Distance ─────────────────────────────────────────────────────────────────
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const f1 = lat1 * Math.PI / 180, f2 = lat2 * Math.PI / 180;
  const df = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function fmtDist(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

// ─── API functions ─────────────────────────────────────────────────────────────
async function fetchWikiPlaces(lat: number, lon: number, radius: number, color: string, categoryId: string): Promise<WikiPlace[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=50&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  return ((data.query?.geosearch ?? []) as { pageid: number; title: string; lat: number; lon: number; dist: number }[])
    .map(p => ({
      uid: `wiki:${p.pageid}`,
      pageid: p.pageid,
      title: p.title,
      lat: p.lat,
      lon: p.lon,
      dist: p.dist,
      source: 'wiki' as const,
      category: categoryId,
      color,
    }));
}

async function fetchBatchThumbs(places: WikiPlace[]): Promise<Record<string, string>> {
  if (!places.length) return {};
  const titles = places.map(p => p.title).join('|');
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&pithumbsize=140&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = data.query?.pages ?? {};
  const map: Record<string, string> = {};
  for (const page of Object.values(pages) as { pageid: number; thumbnail?: { source: string } }[]) {
    if (page.thumbnail?.source) map[`wiki:${page.pageid}`] = page.thumbnail.source;
  }
  return map;
}

async function fetchWikiSummary(title: string): Promise<PlaceDetail> {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  return res.json();
}

async function fetchOsmPlaces(lat: number, lon: number, radius: number, template: string, color: string, categoryId: string): Promise<WikiPlace[]> {
  const inner = template
    .replace(/RADIUS/g, String(radius))
    .replace(/LAT/g, String(lat))
    .replace(/LON/g, String(lon));
  const query = `[out:json][timeout:20];(${inner});out body center 50;`;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 22000);
  try {
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { signal: controller.signal },
    );
    const data = await res.json();
    return ((data.elements ?? []) as OsmElement[])
      .filter(e => (e.lat ?? e.center?.lat) != null && e.tags?.name)
      .map(e => {
        const eLat = e.lat ?? e.center!.lat;
        const eLon = e.lon ?? e.center!.lon;
        return {
          uid: `osm:${e.id}`,
          pageid: e.id,
          title: e.tags!.name!,
          lat: eLat,
          lon: eLon,
          dist: haversineM(lat, lon, eLat, eLon),
          source: 'osm' as const,
          category: categoryId,
          color,
          osmTags: e.tags,
        };
      })
      .sort((a, b) => a.dist - b.dist);
  } finally {
    clearTimeout(tid);
  }
}

async function fetchWeather(lat: number, lon: number): Promise<Weather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`;
    const res = await fetch(url);
    const data = await res.json();
    const c = data.current;
    if (!c) return null;
    return { temp: Math.round(c.temperature_2m), code: c.weather_code, wind: Math.round(c.wind_speed_10m) };
  } catch { return null; }
}

// ─── Favorites helpers ────────────────────────────────────────────────────────
const FAV_KEY = 'discover_favorites_v1';

function loadFavs(): WikiPlace[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}

function saveFavs(favs: WikiPlace[]): void {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TripExplorer() {
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]);
  const [mapZoom, setMapZoom] = useState(13);
  const [places, setPlaces] = useState<WikiPlace[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [selected, setSelected] = useState<WikiPlace | null>(null);
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [favorites, setFavorites] = useState<WikiPlace[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [radius, setRadius] = useState(5000);
  const [discovering, setDiscovering] = useState(false);
  const [searching, setSearching] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [osmError, setOsmError] = useState(false);
  const currentCenter = useRef<[number, number]>(mapCenter);

  // Load favorites on mount and read URL params
  useEffect(() => {
    setFavorites(loadFavs());
    try {
      const params = new URLSearchParams(window.location.search);
      const lat = parseFloat(params.get('lat') || '');
      const lon = parseFloat(params.get('lon') || '');
      const z = parseInt(params.get('z') || '13', 10);
      if (!isNaN(lat) && !isNaN(lon)) {
        setMapCenter([lat, lon]);
        setMapZoom(z || 14);
      }
    } catch { /* ignore */ }
  }, []);

  const isFav = useCallback((uid: string) => favorites.some(f => f.uid === uid), [favorites]);

  const toggleFav = useCallback((place: WikiPlace) => {
    setFavorites(prev => {
      const next = prev.some(f => f.uid === place.uid)
        ? prev.filter(f => f.uid !== place.uid)
        : [...prev, place];
      saveFavs(next);
      return next;
    });
  }, []);

  const getCat = useCallback((id: string) => CATEGORIES.find(c => c.id === id)!, []);

  const discover = useCallback(async (lat: number, lon: number, rad: number, catId: string) => {
    const cat = getCat(catId);
    if (cat.source === 'local') return;
    setDiscovering(true);
    setSelected(null);
    setDetail(null);
    setOsmError(false);
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
    } catch {
      setOsmError(true);
      setPlaces([]);
    } finally {
      setDiscovering(false);
    }
    // Fetch weather in background
    fetchWeather(lat, lon).then(w => { if (w) setWeather(w); });
  }, [getCat]);

  const handleDiscover = useCallback(() => {
    discover(mapCenter[0], mapCenter[1], radius, category);
  }, [mapCenter, radius, category, discover]);

  const handleCategoryChange = useCallback((catId: string) => {
    setCategory(catId);
    setSelected(null);
    setDetail(null);
    if (catId !== 'saved') {
      discover(mapCenter[0], mapCenter[1], radius, catId);
    }
  }, [mapCenter, radius, discover]);

  const handlePlaceClick = useCallback(async (place: WikiPlace) => {
    setSelected(place);
    setDetail(null);
    if (place.source === 'wiki') {
      setDetailLoading(true);
      try {
        const d = await fetchWikiSummary(place.title);
        setDetail(d);
      } catch { /* silent */ }
      finally { setDetailLoading(false); }
    }
  }, []);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQ)}&format=json&limit=1`,
      );
      const data = await res.json();
      if (data[0]) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setMapCenter([lat, lon]);
        setMapZoom(13);
        await discover(lat, lon, radius, category);
      }
    } catch { /* silent */ }
    finally { setSearching(false); }
  }, [searchQ, radius, category, discover]);

  const goToLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setMapCenter([lat, lon]);
        setMapZoom(15);
        setLocating(false);
      },
      () => setLocating(false),
    );
  }, []);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setMapCenter([lat, lon]);
        setMapZoom(14);
        await discover(lat, lon, radius, category);
        setLocating(false);
      },
      () => setLocating(false),
    );
  }, [radius, category, discover]);

  const handleMapMoveEnd = useCallback((lat: number, lon: number) => {
    currentCenter.current = [lat, lon];
  }, []);

  const handleRadiusChange = useCallback((r: number) => {
    setRadius(r);
    if (places.length > 0) discover(mapCenter[0], mapCenter[1], r, category);
  }, [places.length, mapCenter, category, discover]);

  const handleShare = useCallback(() => {
    if (!selected) return;
    const url = `${window.location.origin}/tools/trip-explorer?lat=${selected.lat}&lon=${selected.lon}&z=15`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [selected]);

  const openDirections = useCallback((lat: number, lon: number) => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${lat},${lon}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    window.open(url, '_blank');
  }, []);

  const activeList = category === 'saved' ? favorites : places;

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
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search city, landmark, country…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            aria-label="Search location"
          />
          <button type="submit" className={styles.searchBtn} disabled={searching} aria-label="Search">
            {searching ? <span className={styles.spinner} /> : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            )}
          </button>
        </form>

        <div className={styles.headerBtns}>
          <button type="button" className={styles.nearMeBtn} onClick={handleNearMe} disabled={locating} title="Near me — go to location and discover">
            {locating ? <span className={styles.spinner} /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
            )}
            <span className={styles.nearMeLabel}>Near me</span>
          </button>
        </div>
      </header>

      {/* ── Category pills ── */}
      <div className={styles.categoryRow}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`${styles.catBtn} ${category === cat.id ? styles.catBtnActive : ''}`}
            style={category === cat.id ? { '--cat-color': cat.color } as React.CSSProperties : undefined}
            onClick={() => handleCategoryChange(cat.id)}
          >
            <span className={styles.catIcon}>{cat.icon}</span>
            <span className={styles.catLabel}>{cat.label}</span>
            {cat.id === 'saved' && favorites.length > 0 && (
              <span className={styles.catCount}>{favorites.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Controls + weather ── */}
      <div className={styles.controls}>
        <span className={styles.controlLabel}>Radius</span>
        {RADII.map(r => (
          <button
            key={r.value}
            type="button"
            className={`${styles.radiusBtn} ${radius === r.value ? styles.radiusBtnActive : ''}`}
            onClick={() => handleRadiusChange(r.value)}
          >
            {r.label}
          </button>
        ))}
        {category !== 'saved' && (
          <button type="button" className={styles.discoverBtn} onClick={handleDiscover} disabled={discovering}>
            {discovering ? <><span className={styles.spinner} /> Searching…</> : <>✦ Discover here</>}
          </button>
        )}
        {activeList.length > 0 && !discovering && (
          <span className={styles.countBadge}>{activeList.length}</span>
        )}
        {weather && (
          <span className={styles.weatherChip} title={`${wLabel(weather.code)} · Wind ${weather.wind} km/h`}>
            {wIcon(weather.code)} {weather.temp}°C
          </span>
        )}
      </div>

      {/* ── Main ── */}
      <div className={styles.main}>

        {/* Map */}
        <div className={styles.mapWrap}>
          <MapView
            center={mapCenter}
            zoom={mapZoom}
            places={category === 'saved' ? favorites : places}
            selectedUid={selected?.uid ?? null}
            onPlaceClick={handlePlaceClick}
            onMapMoveEnd={handleMapMoveEnd}
          />

          {/* Floating locate button */}
          <button
            type="button"
            className={styles.locateFloatBtn}
            onClick={goToLocation}
            title="Go to my location"
            aria-label="Go to my location"
          >
            {locating ? <span className={styles.spinnerDark} /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            )}
          </button>

          {activeList.length === 0 && !discovering && category !== 'saved' && (
            <div className={styles.mapHint}>
              Select a category and click <strong>Discover here</strong> to find places nearby
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>

          {/* Detail panel */}
          {selected && (
            <div className={styles.detailPanel}>
              <button type="button" className={styles.backBtn} onClick={() => { setSelected(null); setDetail(null); }}>
                ← Back
              </button>

              {/* OSM detail */}
              {selected.source === 'osm' && selected.osmTags && (
                <div className={styles.detailContent}>
                  <div className={styles.osmHeader}>
                    <span className={styles.osmCatChip} style={{ background: getCat(selected.category)?.color + '22', color: getCat(selected.category)?.color, borderColor: getCat(selected.category)?.color + '44' }}>
                      {getCat(selected.category)?.icon} {getCat(selected.category)?.label}
                    </span>
                    <h2 className={styles.detailTitle} style={{ margin: 0 }}>{selected.title}</h2>
                    <span className={styles.detailDist}>📍 {fmtDist(selected.dist)} away</span>
                  </div>

                  <div className={styles.osmMeta}>
                    {selected.osmTags.cuisine && (
                      <div className={styles.osmRow}><span className={styles.osmKey}>Cuisine</span><span>{selected.osmTags.cuisine.replace(/_/g, ' ')}</span></div>
                    )}
                    {selected.osmTags.opening_hours && (
                      <div className={styles.osmRow}><span className={styles.osmKey}>Hours</span><span className={styles.osmHours}>{selected.osmTags.opening_hours}</span></div>
                    )}
                    {(selected.osmTags['addr:street'] || selected.osmTags['addr:housenumber']) && (
                      <div className={styles.osmRow}><span className={styles.osmKey}>Address</span><span>{[selected.osmTags['addr:housenumber'], selected.osmTags['addr:street'], selected.osmTags['addr:city']].filter(Boolean).join(', ')}</span></div>
                    )}
                    {(selected.osmTags.phone || selected.osmTags['contact:phone']) && (
                      <div className={styles.osmRow}>
                        <span className={styles.osmKey}>Phone</span>
                        <a href={`tel:${selected.osmTags.phone || selected.osmTags['contact:phone']}`} className={styles.osmLink}>{selected.osmTags.phone || selected.osmTags['contact:phone']}</a>
                      </div>
                    )}
                    {(selected.osmTags.website || selected.osmTags['contact:website']) && (
                      <div className={styles.osmRow}>
                        <span className={styles.osmKey}>Website</span>
                        <a href={selected.osmTags.website || selected.osmTags['contact:website']} target="_blank" rel="noopener noreferrer" className={styles.osmLink}>
                          {(selected.osmTags.website || selected.osmTags['contact:website'] || '').replace(/^https?:\/\/(www\.)?/, '').substring(0, 35)}
                        </a>
                      </div>
                    )}
                    {selected.osmTags.stars && (
                      <div className={styles.osmRow}><span className={styles.osmKey}>Stars</span><span>{'⭐'.repeat(Math.min(5, parseInt(selected.osmTags.stars)))}</span></div>
                    )}
                  </div>

                  <div className={styles.detailActions}>
                    <button type="button" className={styles.actionBtn} onClick={() => openDirections(selected.lat, selected.lon)}>
                      🗺️ Directions
                    </button>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lon}`} target="_blank" rel="noopener noreferrer" className={styles.actionBtnOutline}>
                      View on Google Maps
                    </a>
                    <button type="button" className={`${styles.actionBtnOutline} ${isFav(selected.uid) ? styles.actionBtnFav : ''}`} onClick={() => toggleFav(selected)}>
                      {isFav(selected.uid) ? '❤️ Saved' : '🤍 Save'}
                    </button>
                    <button type="button" className={styles.actionBtnOutline} onClick={handleShare}>
                      {copied ? '✓ Copied!' : '🔗 Share'}
                    </button>
                  </div>
                </div>
              )}

              {/* Wikipedia detail */}
              {selected.source === 'wiki' && (
                <>
                  {detailLoading ? (
                    <div className={styles.detailSkeleton}>
                      <div className={styles.skeletonImg} />
                      <div className={styles.skeletonLine} />
                      <div className={styles.skeletonLine} style={{ width: '80%' }} />
                      <div className={styles.skeletonLine} style={{ width: '90%' }} />
                      <div className={styles.skeletonLine} style={{ width: '60%' }} />
                    </div>
                  ) : detail ? (
                    <div className={styles.detailContent}>
                      {detail.thumbnail && (
                        <img src={detail.thumbnail.source} alt={detail.title} className={styles.detailImg} />
                      )}
                      <h2 className={styles.detailTitle}>{detail.title}</h2>
                      <span className={styles.detailDist}>📍 {fmtDist(selected.dist)} away</span>
                      <p className={styles.detailExtract}>{detail.extract}</p>
                      <div className={styles.detailActions}>
                        {detail.content_urls && (
                          <a href={detail.content_urls.desktop.page} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}>
                            📖 Wikipedia
                          </a>
                        )}
                        <button type="button" className={styles.actionBtnOutline} onClick={() => openDirections(selected.lat, selected.lon)}>
                          🗺️ Directions
                        </button>
                        <button type="button" className={`${styles.actionBtnOutline} ${isFav(selected.uid) ? styles.actionBtnFav : ''}`} onClick={() => toggleFav(selected)}>
                          {isFav(selected.uid) ? '❤️ Saved' : '🤍 Save'}
                        </button>
                        <button type="button" className={styles.actionBtnOutline} onClick={handleShare}>
                          {copied ? '✓ Copied!' : '🔗 Share'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}

          {/* Place list */}
          {!selected && (
            <div className={styles.placesList}>
              {osmError && (
                <div className={styles.osmError}>
                  ⚠️ OpenStreetMap data is slow to respond. Try again or use a smaller radius.
                </div>
              )}
              {activeList.length === 0 && !discovering ? (
                <div className={styles.emptyState}>
                  {category === 'saved' ? (
                    <>
                      <div className={styles.emptyIcon}>❤️</div>
                      <p className={styles.emptyTitle}>No saved places yet</p>
                      <p className={styles.emptyDesc}>Open any place and tap <strong>Save</strong> to bookmark it here.</p>
                    </>
                  ) : (
                    <>
                      <div className={styles.emptyIcon}>{getCat(category)?.icon}</div>
                      <p className={styles.emptyTitle}>Ready to explore</p>
                      <p className={styles.emptyDesc}>Pan the map to your destination, then hit <strong>Discover here</strong> to find places nearby.</p>
                    </>
                  )}
                </div>
              ) : (
                activeList.map(place => (
                  <button type="button" key={place.uid} className={styles.placeCard} onClick={() => handlePlaceClick(place)}>
                    {place.thumbnail ? (
                      <img src={place.thumbnail} alt="" className={styles.cardThumb} aria-hidden="true" />
                    ) : (
                      <div className={styles.cardThumbFallback} style={{ background: place.color + '22' }}>
                        <span style={{ fontSize: 20 }}>{getCat(place.category)?.icon ?? '📍'}</span>
                      </div>
                    )}
                    <div className={styles.cardInfo}>
                      <span className={styles.cardTitle}>{place.title}</span>
                      <div className={styles.cardMeta}>
                        {place.osmTags?.cuisine && <span className={styles.cardTag}>{place.osmTags.cuisine.split(';')[0].replace(/_/g, ' ')}</span>}
                        {place.osmTags?.stars && <span className={styles.cardTag}>{'⭐'.repeat(Math.min(5, parseInt(place.osmTags.stars)))}</span>}
                        <span className={styles.cardDist}>{fmtDist(place.dist)}</span>
                      </div>
                    </div>
                    <svg className={styles.cardChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                ))
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
