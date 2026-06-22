'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Globe, Landmark, UtensilsCrossed, Coffee, BedDouble, Trees, Palette,
  Clapperboard, Waves, Beer, ShoppingBag, HeartPulse, Heart, Plane,
  Search, Navigation, Crosshair, ArrowLeft, ChevronRight, ChevronDown,
  MapPin, Share2, BookOpen, ExternalLink, Pin, PinOff,
  Sun, Cloud, CloudRain, Snowflake, CloudLightning, CloudDrizzle,
  Wind, Droplets, CalendarDays, Info, Globe2, Clock,
  CreditCard, Languages, Car,
} from 'lucide-react';
import type { WikiPlace } from './MapView';
import styles from './TripExplorer.module.css';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <span className={styles.mapLoadingDot} />
      Loading map…
    </div>
  ),
});

// ─── Types ───────────────────────────────────────────────────────────────────
type AppTab = 'explore' | 'plan' | 'saved';

interface Category {
  id: string;
  label: string;
  Icon: React.ElementType;
  color: string;
  source: 'wiki' | 'osm';
  osmTemplate?: string;
}

interface PlanSectionDef {
  id: string;
  Icon: React.ElementType;
  title: string;
  color: string;
  wiki: boolean;
  osmTemplate?: string;
}

interface PlaceDetail { title: string; extract: string; thumbnail?: { source: string }; content_urls?: { desktop: { page: string } }; }
interface Weather { temp: number; code: number; wind: number; }
interface DailyForecast { date: string; maxTemp: number; minTemp: number; code: number; precipProb: number; }
interface CountryInfo { name: string; flag: string; currencies: string; languages: string; timezones: string; drivingSide: string; }
interface OsmElement { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string>; }
interface PlanResult { sectionId: string; places: WikiPlace[]; loading: boolean; error: boolean; }

// ─── Data ────────────────────────────────────────────────────────────────────
const EXPLORE_CATEGORIES: Category[] = [
  { id: 'all',           label: 'All',       Icon: Globe,          color: '#4f8ef7', source: 'wiki' },
  { id: 'landmarks',     label: 'Landmarks', Icon: Landmark,       color: '#6366f1', source: 'wiki' },
  { id: 'restaurants',   label: 'Eat',       Icon: UtensilsCrossed,color: '#f97316', source: 'osm', osmTemplate: 'node["amenity"="restaurant"](around:RADIUS,LAT,LON);' },
  { id: 'cafes',         label: 'Cafes',     Icon: Coffee,         color: '#d97706', source: 'osm', osmTemplate: 'node["amenity"~"^(cafe|coffee_shop)$"](around:RADIUS,LAT,LON);' },
  { id: 'hotels',        label: 'Stay',      Icon: BedDouble,      color: '#a855f7', source: 'osm', osmTemplate: 'node["tourism"~"^(hotel|hostel|guest_house|motel)$"](around:RADIUS,LAT,LON);' },
  { id: 'parks',         label: 'Nature',    Icon: Trees,          color: '#22c55e', source: 'osm', osmTemplate: 'node["leisure"~"^(park|nature_reserve|garden)$"](around:RADIUS,LAT,LON);' },
  { id: 'culture',       label: 'Culture',   Icon: Palette,        color: '#ec4899', source: 'osm', osmTemplate: 'node["tourism"~"^(museum|gallery|attraction)$"](around:RADIUS,LAT,LON);' },
  { id: 'entertainment', label: 'Fun',       Icon: Clapperboard,   color: '#f43f5e', source: 'osm', osmTemplate: 'node["amenity"~"^(cinema|theatre|arts_centre)$"](around:RADIUS,LAT,LON);node["leisure"~"^(amusement_arcade|water_park|escape_game)$"](around:RADIUS,LAT,LON);' },
  { id: 'beach',         label: 'Beach',     Icon: Waves,          color: '#06b6d4', source: 'osm', osmTemplate: 'node["natural"="beach"](around:RADIUS,LAT,LON);node["leisure"="beach_resort"](around:RADIUS,LAT,LON);' },
  { id: 'nightlife',     label: 'Nightlife', Icon: Beer,           color: '#ef4444', source: 'osm', osmTemplate: 'node["amenity"~"^(bar|pub|nightclub)$"](around:RADIUS,LAT,LON);' },
  { id: 'shopping',      label: 'Shopping',  Icon: ShoppingBag,    color: '#14b8a6', source: 'osm', osmTemplate: 'node["shop"~"^(mall|department_store|marketplace|supermarket)$"](around:RADIUS,LAT,LON);node["amenity"="marketplace"](around:RADIUS,LAT,LON);' },
  { id: 'health',        label: 'Health',    Icon: HeartPulse,     color: '#10b981', source: 'osm', osmTemplate: 'node["amenity"~"^(hospital|pharmacy|clinic|doctors)$"](around:RADIUS,LAT,LON);' },
];

const PLAN_SECTIONS: PlanSectionDef[] = [
  { id: 'landmarks',   Icon: Landmark,        title: 'Top Landmarks',  color: '#6366f1', wiki: true },
  { id: 'hotels',      Icon: BedDouble,       title: 'Where to Stay',  color: '#a855f7', wiki: false, osmTemplate: 'node["tourism"~"^(hotel|hostel|guest_house|motel)$"](around:5000,LAT,LON);' },
  { id: 'restaurants', Icon: UtensilsCrossed, title: 'Where to Eat',   color: '#f97316', wiki: false, osmTemplate: 'node["amenity"="restaurant"](around:5000,LAT,LON);' },
  { id: 'culture',     Icon: Palette,         title: 'Things to Do',   color: '#ec4899', wiki: false, osmTemplate: 'node["tourism"~"^(museum|gallery|attraction)$"](around:5000,LAT,LON);' },
  { id: 'parks',       Icon: Trees,           title: 'Nature & Parks', color: '#22c55e', wiki: false, osmTemplate: 'node["leisure"~"^(park|nature_reserve|garden)$"](around:5000,LAT,LON);' },
  { id: 'cafes',       Icon: Coffee,          title: 'Cafes & Coffee', color: '#d97706', wiki: false, osmTemplate: 'node["amenity"~"^(cafe|coffee_shop)$"](around:5000,LAT,LON);' },
  { id: 'nightlife',   Icon: Beer,            title: 'Nightlife',      color: '#ef4444', wiki: false, osmTemplate: 'node["amenity"~"^(bar|pub|nightclub)$"](around:5000,LAT,LON);' },
];

const RADII = [{ label: '1 km', value: 1000 }, { label: '5 km', value: 5000 }, { label: '10 km', value: 10000 }, { label: '25 km', value: 25000 }];

// "All" fetches every category except itself
const ALL_GROUP_CATS = EXPLORE_CATEGORIES.filter(c => c.id !== 'all');

// ─── Utilities ───────────────────────────────────────────────────────────────
const NOISE_RE = /\b(attack|attacks|shooting|stabbing|bombing|explosion|massacre|murder|murders|killing|killed|suicide|crash|collision|accident|disaster|fire of|flood|hurricane|earthquake|riot|riots|protests|death|deaths|obituary|funeral|scandal|siege|hostage|abduction|kidnapping|terrorism|terrorist|genocide)\b/i;
function filterWikiNoise<T extends { title: string }>(places: T[]): T[] { return places.filter(p => !NOISE_RE.test(p.title)); }

function WeatherIcon({ code, size = 14 }: { code: number; size?: number }) {
  const p = { size, strokeWidth: 1.8 };
  if (code === 0) return <Sun {...p} className={styles.wiSun} />;
  if (code <= 3)  return <Cloud {...p} className={styles.wiCloud} />;
  if (code <= 48) return <Wind {...p} />;
  if (code <= 57) return <CloudDrizzle {...p} className={styles.wiRain} />;
  if (code <= 67) return <CloudRain {...p} className={styles.wiRain} />;
  if (code <= 77) return <Snowflake {...p} className={styles.wiSnow} />;
  if (code <= 82) return <CloudRain {...p} className={styles.wiRain} />;
  return <CloudLightning {...p} className={styles.wiStorm} />;
}
function wLabel(c: number) { if (c===0) return 'Clear'; if (c<=3) return 'Partly cloudy'; if (c<=48) return 'Foggy'; if (c<=57) return 'Drizzle'; if (c<=67) return 'Rainy'; if (c<=77) return 'Snowy'; if (c<=82) return 'Showers'; return 'Thunderstorm'; }
function haversineM(a1: number, o1: number, a2: number, o2: number) { const R=6371000,f1=a1*Math.PI/180,f2=a2*Math.PI/180,df=(a2-a1)*Math.PI/180,dl=(o2-o1)*Math.PI/180,a=Math.sin(df/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2; return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))); }
function fmtDist(m: number) { return m < 1000 ? `${m} m` : `${(m/1000).toFixed(1)} km`; }

// ─── API ─────────────────────────────────────────────────────────────────────
async function fetchWikiPlaces(lat: number, lon: number, radius: number, color: string, catId: string): Promise<WikiPlace[]> {
  const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=500&format=json&origin=*`);
  const data = await res.json();
  const raw = (data.query?.geosearch ?? []) as { pageid: number; title: string; lat: number; lon: number; dist: number }[];
  return filterWikiNoise(raw).map(p => ({ uid: `wiki:${p.pageid}`, pageid: p.pageid, title: p.title, lat: p.lat, lon: p.lon, dist: p.dist, source: 'wiki' as const, category: catId, color }));
}

// Wikipedia's API accepts at most 50 titles per request — batch accordingly
async function fetchBatchThumbs(places: WikiPlace[]): Promise<Record<string, string>> {
  if (!places.length) return {};
  const CHUNK = 50;
  const out: Record<string, string> = {};
  for (let i = 0; i < places.length; i += CHUNK) {
    const chunk = places.slice(i, i + CHUNK);
    const titles = chunk.map(p => p.title).join('|');
    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&pithumbsize=140&format=json&origin=*`);
      const data = await res.json();
      for (const page of Object.values(data.query?.pages ?? {}) as { pageid: number; thumbnail?: { source: string } }[])
        if (page.thumbnail?.source) out[`wiki:${page.pageid}`] = page.thumbnail.source;
    } catch { /* skip this chunk — places still show, just without thumbnails */ }
  }
  return out;
}

async function fetchWikiSummary(title: string): Promise<PlaceDetail> {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  return res.json();
}

// Multiple public Overpass endpoints — tried in order, first success wins
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

function parseOsmElements(elements: OsmElement[], lat: number, lon: number, color: string, catId: string): WikiPlace[] {
  return elements
    .filter(e => (e.lat ?? e.center?.lat) != null && e.tags?.name)
    .map(e => {
      const eLat = e.lat ?? e.center!.lat, eLon = e.lon ?? e.center!.lon;
      return { uid: `osm:${e.id}`, pageid: e.id, title: e.tags!.name!, lat: eLat, lon: eLon, dist: haversineM(lat, lon, eLat, eLon), source: 'osm' as const, category: catId, color, osmTags: e.tags };
    })
    .sort((a, b) => a.dist - b.dist);
}

async function fetchOsmPlaces(lat: number, lon: number, radius: number, template: string, color: string, catId: string): Promise<WikiPlace[]> {
  const inner = template.replace(/RADIUS/g, String(radius)).replace(/LAT/g, String(lat)).replace(/LON/g, String(lon));
  // `out tags center` skips full geometry — much faster in dense cities
  const query = `[out:json][timeout:20][maxsize:2000000];(${inner});out tags center 60;`;
  const encoded = encodeURIComponent(query);

  let lastErr: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 22000);
    try {
      const res = await fetch(`${endpoint}?data=${encoded}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      clearTimeout(tid);
      return parseOsmElements(data.elements ?? [], lat, lon, color, catId);
    } catch (err) {
      clearTimeout(tid);
      lastErr = err;
      // Try next endpoint
    }
  }
  throw lastErr;
}

async function fetchWeather(lat: number, lon: number): Promise<Weather | null> {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`);
    const d = (await r.json()).current;
    return d ? { temp: Math.round(d.temperature_2m), code: d.weather_code, wind: Math.round(d.wind_speed_10m) } : null;
  } catch { return null; }
}

async function fetchForecast(lat: number, lon: number): Promise<DailyForecast[]> {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=14`);
    const d = await r.json();
    if (!d.daily) return [];
    return (d.daily.time as string[]).map((date, i) => ({ date, maxTemp: Math.round(d.daily.temperature_2m_max[i]), minTemp: Math.round(d.daily.temperature_2m_min[i]), code: d.daily.weather_code[i], precipProb: d.daily.precipitation_probability_max[i] ?? 0 }));
  } catch { return []; }
}

async function fetchCountryInfo(cc: string): Promise<CountryInfo | null> {
  try {
    const r = await fetch(`https://restcountries.com/v3.1/alpha/${cc}?fields=name,currencies,languages,timezones,flags,car`);
    const d = await r.json();
    return {
      name: d.name?.common ?? '',
      flag: d.flags?.svg ?? d.flags?.png ?? '',
      currencies: Object.values(d.currencies || {}).map((c: unknown) => (c as { name: string; symbol: string }).name + ' (' + (c as { name: string; symbol: string }).symbol + ')').join(', '),
      languages: Object.values(d.languages || {}).join(', '),
      timezones: (d.timezones || []).slice(0, 2).join(', '),
      drivingSide: d.car?.side === 'left' ? 'Left-hand traffic' : 'Right-hand traffic',
    };
  } catch { return null; }
}

const FAV_KEY = 'discover_favorites_v1';
function loadFavs(): WikiPlace[] { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } }
function saveFavs(f: WikiPlace[]) { localStorage.setItem(FAV_KEY, JSON.stringify(f)); }

// ─── Component ───────────────────────────────────────────────────────────────
export default function TripExplorer() {
  // Layout state
  const [tab, setTab] = useState<AppTab>('explore');

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]);
  const [mapZoom, setMapZoom] = useState(13);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [pinnedLocation, setPinnedLocation] = useState<[number, number] | null>(null);
  const [pinMode, setPinMode] = useState(false);

  // Explore state
  const [category, setCategory] = useState('all');
  const [radius, setRadius] = useState(5000);
  const [places, setPlaces] = useState<WikiPlace[]>([]);
  const [allGroups, setAllGroups] = useState<PlanResult[]>([]);
  const [sortBy, setSortBy] = useState<'dist' | 'name'>('dist');
  const [discovering, setDiscovering] = useState(false);
  const [osmError, setOsmError] = useState(false);
  const [wikiError, setWikiError] = useState(false);

  // Detail state
  const [selected, setSelected] = useState<WikiPlace | null>(null);
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Weather/forecast state
  const [weather, setWeather] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [travelDate, setTravelDate] = useState('');

  // Plan state
  const [planCityQ, setPlanCityQ] = useState('');
  const [planCity, setPlanCity] = useState('');
  const [planResults, setPlanResults] = useState<PlanResult[]>([]);
  const [planning, setPlanning] = useState(false);
  const [planCountry, setPlanCountry] = useState<CountryInfo | null>(null);
  const [planWeather, setPlanWeather] = useState<Weather | null>(null);

  // Saved state
  const [favorites, setFavorites] = useState<WikiPlace[]>([]);

  // Search
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setFavorites(loadFavs());
    try {
      const p = new URLSearchParams(window.location.search);
      const lat = parseFloat(p.get('lat') || ''), lon = parseFloat(p.get('lon') || '');
      if (!isNaN(lat) && !isNaN(lon)) { setMapCenter([lat, lon]); setMapZoom(parseInt(p.get('z') || '14', 10)); }
    } catch { /* ignore */ }
  }, []);

  const getCat = useCallback((id: string) => EXPLORE_CATEGORIES.find(c => c.id === id), []);
  const isFav = useCallback((uid: string) => favorites.some(f => f.uid === uid), [favorites]);
  const toggleFav = useCallback((place: WikiPlace) => {
    setFavorites(prev => { const next = prev.some(f => f.uid === place.uid) ? prev.filter(f => f.uid !== place.uid) : [...prev, place]; saveFavs(next); return next; });
  }, []);

  const loadWeather = useCallback((lat: number, lon: number) => {
    fetchWeather(lat, lon).then(w => { if (w) setWeather(w); });
    fetchForecast(lat, lon).then(setForecast);
  }, []);

  const discover = useCallback(async (lat: number, lon: number, rad: number, catId: string) => {
    setDiscovering(true); setSelected(null); setDetail(null); setOsmError(false); setWikiError(false);
    loadWeather(lat, lon);

    if (catId === 'all') {
      // Run every category in parallel, stream results in as they arrive
      setAllGroups(ALL_GROUP_CATS.map(c => ({ sectionId: c.id, places: [], loading: true, error: false })));
      setPlaces([]);
      await Promise.allSettled(ALL_GROUP_CATS.map(async cat => {
        try {
          let raw: WikiPlace[] = [];
          if (cat.source === 'wiki') {
            raw = await fetchWikiPlaces(lat, lon, rad, cat.color, cat.id);
            const thumbs = await fetchBatchThumbs(raw);
            raw = raw.map(p => ({ ...p, thumbnail: thumbs[p.uid] })).slice(0, 15);
          } else if (cat.osmTemplate) {
            raw = (await fetchOsmPlaces(lat, lon, rad, cat.osmTemplate, cat.color, cat.id)).slice(0, 15);
          }
          setAllGroups(prev => prev.map(g => g.sectionId === cat.id ? { ...g, places: raw, loading: false } : g));
        } catch {
          setAllGroups(prev => prev.map(g => g.sectionId === cat.id ? { ...g, loading: false, error: true } : g));
        }
      }));
      setDiscovering(false);
      return;
    }

    const cat = getCat(catId);
    if (!cat) { setDiscovering(false); return; }
    setAllGroups([]);
    try {
      let raw: WikiPlace[] = [];
      if (cat.source === 'wiki') {
        try {
          raw = await fetchWikiPlaces(lat, lon, rad, cat.color, catId);
          const thumbs = await fetchBatchThumbs(raw);
          raw = raw.map(p => ({ ...p, thumbnail: thumbs[p.uid] }));
        } catch { setWikiError(true); raw = []; }
      } else if (cat.osmTemplate) {
        try {
          raw = await fetchOsmPlaces(lat, lon, rad, cat.osmTemplate, cat.color, catId);
        } catch { setOsmError(true); raw = []; }
      }
      setPlaces(raw);
    } finally { setDiscovering(false); }
  }, [getCat, loadWeather]);

  const discoverCenter = useCallback(() => {
    const loc = pinnedLocation ?? mapCenter;
    discover(loc[0], loc[1], radius, category);
  }, [pinnedLocation, mapCenter, radius, category, discover]);

  const handleCategoryChange = useCallback((catId: string) => {
    setCategory(catId); setSelected(null); setDetail(null);
    const loc = pinnedLocation ?? mapCenter;
    discover(loc[0], loc[1], radius, catId);
  }, [pinnedLocation, mapCenter, radius, discover]);

  const handlePlaceClick = useCallback(async (place: WikiPlace) => {
    setSelected(place); setDetail(null);
    if (place.source === 'wiki') {
      setDetailLoading(true);
      try { setDetail(await fetchWikiSummary(place.title)); } catch { /* silent */ }
      finally { setDetailLoading(false); }
    }
  }, []);

  const geocode = useCallback(async (query: string) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`);
    const data = await res.json();
    if (!data[0]) return null;
    const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon);
    const cc = data[0].address?.country_code;
    setMapCenter([lat, lon]); setMapZoom(13);
    if (cc) fetchCountryInfo(cc).then(c => { if (c) setWeather(null); });
    return { lat, lon, cc };
  }, []);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const loc = await geocode(searchQ);
      if (loc && tab === 'explore') { await discover(loc.lat, loc.lon, radius, category); }
      loadWeather(loc!.lat, loc!.lon);
    } catch { /* silent */ }
    finally { setSearching(false); }
  }, [searchQ, radius, category, discover, geocode, loadWeather, tab]);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setUserLocation([lat, lon]); setMapCenter([lat, lon]); setMapZoom(14);
        if (tab === 'explore') await discover(lat, lon, radius, category);
        loadWeather(lat, lon);
        setLocating(false);
      },
      () => setLocating(false),
    );
  }, [radius, category, discover, loadWeather, tab]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { const { latitude: lat, longitude: lon } = pos.coords; setUserLocation([lat, lon]); setMapCenter([lat, lon]); setMapZoom(15); setLocating(false); },
      () => setLocating(false),
    );
  }, []);

  const handleMapClick = useCallback((lat: number, lon: number) => { setPinnedLocation([lat, lon]); setPinMode(false); }, []);
  const handleMapMoveEnd = useCallback((_lat: number, _lon: number) => { /* could update center ref */ }, []);

  const handleRadiusChange = useCallback((r: number) => {
    setRadius(r);
    if (places.length > 0) { const loc = pinnedLocation ?? mapCenter; discover(loc[0], loc[1], r, category); }
  }, [places.length, mapCenter, pinnedLocation, category, discover]);

  const handleShare = useCallback(() => {
    if (!selected) return;
    const url = `${window.location.origin}/tools/trip-explorer?lat=${selected.lat}&lon=${selected.lon}&z=15`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [selected]);

  const openDirections = useCallback((lat: number, lon: number) => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.open(ios ? `maps://maps.apple.com/?daddr=${lat},${lon}` : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
  }, []);

  // ── Trip Planner ────────────────────────────────────────────────────────────
  const handlePlanSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planCityQ.trim()) return;
    setPlanning(true); setPlanCity(planCityQ); setPlanCountry(null); setPlanWeather(null);
    setPlanResults(PLAN_SECTIONS.map(s => ({ sectionId: s.id, places: [], loading: true, error: false })));
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(planCityQ)}&format=json&limit=1&addressdetails=1`);
      const geoData = await res.json();
      if (!geoData[0]) throw new Error('Not found');
      const lat = parseFloat(geoData[0].lat), lon = parseFloat(geoData[0].lon);
      const cc = geoData[0].address?.country_code;
      setMapCenter([lat, lon]); setMapZoom(13);
      fetchWeather(lat, lon).then(w => { if (w) setPlanWeather(w); });
      if (cc) fetchCountryInfo(cc).then(c => { if (c) setPlanCountry(c); });

      await Promise.allSettled(PLAN_SECTIONS.map(async sec => {
        try {
          let raw: WikiPlace[] = [];
          if (sec.wiki) {
            raw = await fetchWikiPlaces(lat, lon, 5000, sec.color, sec.id);
            const thumbs = await fetchBatchThumbs(raw);
            raw = raw.map(p => ({ ...p, thumbnail: thumbs[p.uid] })).slice(0, 20);
          } else if (sec.osmTemplate) {
            raw = (await fetchOsmPlaces(lat, lon, 5000, sec.osmTemplate, sec.color, sec.id)).slice(0, 20);
          }
          setPlanResults(prev => prev.map(r => r.sectionId === sec.id ? { ...r, places: raw, loading: false } : r));
        } catch {
          setPlanResults(prev => prev.map(r => r.sectionId === sec.id ? { ...r, loading: false, error: true } : r));
        }
      }));
    } catch { setPlanResults([]); }
    finally { setPlanning(false); }
  }, [planCityQ]);

  const mapPlaces = useMemo(() => {
    if (tab === 'plan') return planResults.flatMap(r => r.places);
    if (tab === 'saved') return favorites;
    if (category === 'all' && allGroups.length) return allGroups.flatMap(g => g.places);
    return places;
  }, [tab, category, places, favorites, planResults, allGroups]);

  const selectedDateForecast = useMemo(() => travelDate && forecast.length ? (forecast.find(f => f.date === travelDate) ?? null) : null, [travelDate, forecast]);

  // ── Renderers ────────────────────────────────────────────────────────────────
  const renderPlaceCard = (place: WikiPlace) => {
    const cat = getCat(place.category);
    return (
      <button type="button" key={place.uid} className={styles.placeCard} onClick={() => handlePlaceClick(place)}>
        {place.thumbnail
          ? <img src={place.thumbnail} alt="" className={styles.cardThumb} />
          : <div className={styles.cardThumbFallback} style={{ background: cat ? cat.color + '22' : undefined }}>
              {cat && <cat.Icon size={18} style={{ color: cat.color }} />}
            </div>
        }
        <div className={styles.cardInfo}>
          <span className={styles.cardTitle}>{place.title}</span>
          <div className={styles.cardMeta}>
            {place.osmTags?.cuisine && <span className={styles.cardTag}>{place.osmTags.cuisine.split(';')[0].replace(/_/g, ' ')}</span>}
            {place.osmTags?.stars && <span className={styles.cardTag}>{'★'.repeat(Math.min(5, parseInt(place.osmTags.stars)))}</span>}
            <span className={styles.cardDist}>{fmtDist(place.dist)}</span>
          </div>
        </div>
        <ChevronRight size={14} className={styles.cardChevron} />
      </button>
    );
  };

  const renderDetail = () => {
    if (!selected) return null;
    const cat = getCat(selected.category);
    const backLabel = tab === 'plan' ? 'Back to plan' : tab === 'saved' ? 'Back to saved' : 'Back to results';
    return (
      <div className={styles.detailPanel}>
        <button type="button" className={styles.backBtn} onClick={() => { setSelected(null); setDetail(null); }}>
          <ArrowLeft size={14} /> {backLabel}
        </button>
        {selected.source === 'osm' && selected.osmTags ? (
          <div className={styles.detailContent}>
            <div className={styles.osmHeader}>
              {cat && (
                <span className={styles.osmCatChip} style={{ background: cat.color + '22', color: cat.color, borderColor: cat.color + '44' }}>
                  <cat.Icon size={12} /> {cat.label}
                </span>
              )}
              <h2 className={styles.detailTitle}>{selected.title}</h2>
              <span className={styles.detailDist}><MapPin size={11} /> {fmtDist(selected.dist)} away</span>
            </div>
            <div className={styles.osmMeta}>
              {selected.osmTags.cuisine && <div className={styles.osmRow}><span className={styles.osmKey}>Cuisine</span><span>{selected.osmTags.cuisine.replace(/_/g, ' ')}</span></div>}
              {selected.osmTags.opening_hours && <div className={styles.osmRow}><span className={styles.osmKey}>Hours</span><span>{selected.osmTags.opening_hours}</span></div>}
              {(selected.osmTags['addr:street'] || selected.osmTags['addr:housenumber']) && <div className={styles.osmRow}><span className={styles.osmKey}>Address</span><span>{[selected.osmTags['addr:housenumber'], selected.osmTags['addr:street'], selected.osmTags['addr:city']].filter(Boolean).join(', ')}</span></div>}
              {(selected.osmTags.phone || selected.osmTags['contact:phone']) && <div className={styles.osmRow}><span className={styles.osmKey}>Phone</span><a href={`tel:${selected.osmTags.phone}`} className={styles.osmLink}>{selected.osmTags.phone || selected.osmTags['contact:phone']}</a></div>}
              {(selected.osmTags.website || selected.osmTags['contact:website']) && <div className={styles.osmRow}><span className={styles.osmKey}>Web</span><a href={selected.osmTags.website || selected.osmTags['contact:website']} target="_blank" rel="noopener noreferrer" className={styles.osmLink}>{(selected.osmTags.website || selected.osmTags['contact:website'] || '').replace(/^https?:\/\/(www\.)?/, '').substring(0, 30)}</a></div>}
              {selected.osmTags.stars && <div className={styles.osmRow}><span className={styles.osmKey}>Stars</span><span className={styles.starRow}>{Array.from({ length: Math.min(5, parseInt(selected.osmTags.stars)) }).map((_, i) => <span key={i} className={styles.starFilled}>★</span>)}</span></div>}
            </div>
            <div className={styles.detailActions}>
              <button type="button" className={styles.actionBtn} onClick={() => openDirections(selected.lat, selected.lon)}><Navigation size={13} /> Directions</button>
              <a href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lon}`} target="_blank" rel="noopener noreferrer" className={styles.actionBtnOutline}><ExternalLink size={12} /> Maps</a>
              <button type="button" className={`${styles.actionBtnOutline} ${isFav(selected.uid) ? styles.actionBtnFav : ''}`} onClick={() => toggleFav(selected)}><Heart size={12} fill={isFav(selected.uid) ? 'currentColor' : 'none'} /> {isFav(selected.uid) ? 'Saved' : 'Save'}</button>
              <button type="button" className={styles.actionBtnOutline} onClick={handleShare}><Share2 size={12} /> {copied ? 'Copied!' : 'Share'}</button>
            </div>
          </div>
        ) : selected.source === 'wiki' ? (
          detailLoading ? (
            <div className={styles.detailSkeleton}><div className={styles.skeletonImg} /><div className={styles.skeletonLine} /><div className={styles.skeletonLine} style={{ width: '80%' }} /><div className={styles.skeletonLine} style={{ width: '60%' }} /></div>
          ) : detail ? (
            <div className={styles.detailContent}>
              {detail.thumbnail && <img src={detail.thumbnail.source} alt={detail.title} className={styles.detailImg} />}
              <h2 className={styles.detailTitle}>{detail.title}</h2>
              <span className={styles.detailDist}><MapPin size={11} /> {fmtDist(selected.dist)} away</span>
              <p className={styles.detailExtract}>{detail.extract}</p>
              <div className={styles.detailActions}>
                {detail.content_urls && <a href={detail.content_urls.desktop.page} target="_blank" rel="noopener noreferrer" className={styles.actionBtn}><BookOpen size={13} /> Wikipedia</a>}
                <button type="button" className={styles.actionBtnOutline} onClick={() => openDirections(selected.lat, selected.lon)}><Navigation size={12} /> Directions</button>
                <button type="button" className={`${styles.actionBtnOutline} ${isFav(selected.uid) ? styles.actionBtnFav : ''}`} onClick={() => toggleFav(selected)}><Heart size={12} fill={isFav(selected.uid) ? 'currentColor' : 'none'} /> {isFav(selected.uid) ? 'Saved' : 'Save'}</button>
                <button type="button" className={styles.actionBtnOutline} onClick={handleShare}><Share2 size={12} /> {copied ? 'Copied!' : 'Share'}</button>
              </div>
            </div>
          ) : null
        ) : null}
      </div>
    );
  };

  const renderExplorePanel = () => (
    <div className={styles.explorePanel}>
      {/* Category grid */}
      <div className={styles.catSection}>
        <span className={styles.sectionLabel}>Category</span>
        <div className={styles.catGrid}>
          {EXPLORE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.catGridBtn} ${category === cat.id ? styles.catGridBtnActive : ''}`}
              style={category === cat.id ? { '--cat-color': cat.color } as React.CSSProperties : undefined}
              onClick={() => handleCategoryChange(cat.id)}
              title={cat.label}
            >
              <cat.Icon size={17} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Radius + Discover */}
      <div className={styles.discoverSection}>
        <div className={styles.radiusRow}>
          <span className={styles.sectionLabel}>Radius</span>
          <div className={styles.radiusBtns}>
            {RADII.map(r => (
              <button key={r.value} type="button" className={`${styles.radiusBtn} ${radius === r.value ? styles.radiusBtnActive : ''}`} onClick={() => handleRadiusChange(r.value)}>{r.label}</button>
            ))}
          </div>
        </div>
        <button type="button" className={styles.discoverBtn} onClick={discoverCenter} disabled={discovering}>
          {discovering ? <><span className={styles.spinner} /> Searching…</> : <><Search size={14} /> Discover {pinnedLocation ? 'pinned spot' : 'this area'}</>}
        </button>
        {pinnedLocation && (
          <button type="button" className={styles.clearPinInline} onClick={() => setPinnedLocation(null)}>
            <PinOff size={12} /> Remove pin
          </button>
        )}
      </div>

      {/* Weather row (collapsible) */}
      {weather && (
        <div className={styles.weatherSection}>
          <button type="button" className={styles.weatherToggle} onClick={() => setForecastOpen(v => !v)}>
            <WeatherIcon code={weather.code} size={14} />
            <span className={styles.weatherToggleText}>
              <strong>{weather.temp}°C</strong> · {wLabel(weather.code)} · {weather.wind} km/h wind
            </span>
            <ChevronDown size={14} className={forecastOpen ? styles.chevronOpen : styles.chevronClosed} />
          </button>
          {forecastOpen && forecast.length > 0 && (
            <div className={styles.forecastPanel}>
              {selectedDateForecast && (
                <div className={styles.forecastSelected}>
                  <CalendarDays size={12} /> {new Date(selectedDateForecast.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  <WeatherIcon code={selectedDateForecast.code} size={12} />
                  {selectedDateForecast.maxTemp}°/{selectedDateForecast.minTemp}°
                  <Droplets size={11} /> {selectedDateForecast.precipProb}%
                </div>
              )}
              <div className={styles.forecastGrid}>
                {forecast.map(day => (
                  <button key={day.date} type="button"
                    className={`${styles.forecastDay} ${travelDate === day.date ? styles.forecastDayActive : ''}`}
                    onClick={() => setTravelDate(p => p === day.date ? '' : day.date)}
                    title={wLabel(day.code)}
                  >
                    <span className={styles.fcDay}>{new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <WeatherIcon code={day.code} size={15} />
                    <span className={styles.fcMax}>{day.maxTemp}°</span>
                    <span className={styles.fcMin}>{day.minTemp}°</span>
                    {day.precipProb > 20 && <span className={styles.fcPrecip}><Droplets size={9} />{day.precipProb}%</span>}
                  </button>
                ))}
              </div>
              <div className={styles.forecastDateRow}>
                <CalendarDays size={12} />
                <input type="date" className={styles.datePicker} value={travelDate}
                  min={new Date().toISOString().split('T')[0]}
                  max={forecast[forecast.length - 1]?.date}
                  onChange={e => setTravelDate(e.target.value)}
                />
                <span className={styles.datePickerLabel}>Pick travel date</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── All: grouped sections ── */}
      {category === 'all' && allGroups.length > 0 && (
        <div className={styles.resultsList}>
          {allGroups.map(group => {
            const cat = getCat(group.sectionId);
            if (!cat) return null;
            const sorted = [...group.places].sort((a, b) => sortBy === 'name' ? a.title.localeCompare(b.title) : a.dist - b.dist);
            return (
              <div key={group.sectionId} className={styles.allGroup}>
                <div className={styles.allGroupHead} style={{ borderLeftColor: cat.color }}>
                  <cat.Icon size={13} style={{ color: cat.color, flexShrink: 0 }} />
                  <span className={styles.allGroupTitle}>{cat.label}</span>
                  {group.loading && <span className={styles.spinner} style={{ marginLeft: 'auto' }} />}
                  {!group.loading && group.places.length > 0 && (
                    <span className={styles.allGroupCount} style={{ background: cat.color + '22', color: cat.color }}>{group.places.length}</span>
                  )}
                </div>
                {group.loading && <div className={styles.planSkeletons}>{[1,2].map(i => <div key={i} className={styles.planSkeleton} />)}</div>}
                {!group.loading && group.error && <div className={styles.planError}>Could not load</div>}
                {!group.loading && sorted.map(renderPlaceCard)}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Single category: flat list ── */}
      {category !== 'all' && (
        <>
          {wikiError && (
            <div className={styles.osmError}>
              <Info size={13} />
              <span>Wikipedia was slow to respond. Try a smaller radius, or retry.</span>
              <button type="button" className={styles.osmRetryBtn} onClick={discoverCenter}>Retry</button>
            </div>
          )}
          {osmError && (
            <div className={styles.osmError}>
              <Info size={13} />
              <span>OpenStreetMap servers were slow for this area. Try a smaller radius, or retry.</span>
              <button type="button" className={styles.osmRetryBtn} onClick={discoverCenter}>Retry</button>
            </div>
          )}
          {places.length > 1 && (
            <div className={styles.sortBar}>
              <span className={styles.sortLabel}>{places.length} results</span>
              <div className={styles.sortBtns}>
                <button type="button" className={`${styles.sortBtn} ${sortBy === 'dist' ? styles.sortBtnActive : ''}`} onClick={() => setSortBy('dist')}>Nearest</button>
                <button type="button" className={`${styles.sortBtn} ${sortBy === 'name' ? styles.sortBtnActive : ''}`} onClick={() => setSortBy('name')}>A → Z</button>
              </div>
            </div>
          )}
          <div className={styles.resultsList}>
            {places.length === 0 && !discovering ? (
              <div className={styles.emptyState}>
                {(() => { const cat = getCat(category); return cat ? <cat.Icon size={32} className={styles.emptyIcon} style={{ color: cat.color }} /> : null; })()}
                <p className={styles.emptyTitle}>Nothing yet</p>
                <p className={styles.emptyDesc}>Pick a category above, then click <strong>Discover this area</strong>.</p>
              </div>
            ) : (
              <>{[...places].sort((a, b) => sortBy === 'name' ? a.title.localeCompare(b.title) : a.dist - b.dist).map(renderPlaceCard)}</>
            )}
          </div>
        </>
      )}

      {/* Empty state for All before first discover */}
      {category === 'all' && allGroups.length === 0 && !discovering && (
        <div className={styles.emptyState}>
          <Globe size={32} className={styles.emptyIcon} style={{ color: '#4f8ef7' }} />
          <p className={styles.emptyTitle}>Nothing yet</p>
          <p className={styles.emptyDesc}>Click <strong>Discover this area</strong> to see everything nearby — landmarks, restaurants, parks and more — grouped by type.</p>
        </div>
      )}
    </div>
  );

  const renderPlanPanel = () => (
    <div className={styles.planPanel}>
      <form className={styles.planForm} onSubmit={handlePlanSearch}>
        <div className={styles.planInputWrap}>
          <Search size={13} className={styles.planSearchIcon} />
          <input className={styles.planInput} type="text" placeholder="Where are you going? (e.g. Tokyo)" value={planCityQ} onChange={e => setPlanCityQ(e.target.value)} />
        </div>
        <button type="submit" className={styles.planBtn} disabled={planning}>
          {planning ? <><span className={styles.spinner} /> Planning…</> : <><Plane size={13} /> Plan trip</>}
        </button>
      </form>

      {planCity && planCountry && (
        <div className={styles.countryCard}>
          {planCountry.flag && <img src={planCountry.flag} alt={planCountry.name} className={styles.countryFlag} />}
          <div className={styles.countryDetails}>
            <span className={styles.countryName}>{planCity}, {planCountry.name}</span>
            <div className={styles.countryGrid}>
              <div className={styles.countryRow}><CreditCard size={11} />{planCountry.currencies}</div>
              <div className={styles.countryRow}><Languages size={11} />{planCountry.languages}</div>
              <div className={styles.countryRow}><Clock size={11} />{planCountry.timezones}</div>
              <div className={styles.countryRow}><Car size={11} />{planCountry.drivingSide}</div>
            </div>
          </div>
        </div>
      )}

      {planCity && planWeather && (
        <div className={styles.planWeather}>
          <WeatherIcon code={planWeather.code} size={13} />
          <span><strong>{planCity}</strong> — {planWeather.temp}°C · {wLabel(planWeather.code)}</span>
          <Wind size={11} /> {planWeather.wind} km/h
        </div>
      )}

      {planResults.length === 0 && !planning && (
        <div className={styles.emptyState} style={{ flex: 1 }}>
          <Globe2 size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Plan your trip</p>
          <p className={styles.emptyDesc}>Enter any destination and get instant recommendations for where to stay, eat, explore, and more.</p>
        </div>
      )}

      {planResults.map(result => {
        const def = PLAN_SECTIONS.find(s => s.id === result.sectionId)!;
        return (
          <div key={result.sectionId} className={styles.planSection}>
            <div className={styles.planSectionHead} style={{ borderLeftColor: def.color }}>
              <def.Icon size={13} style={{ color: def.color, flexShrink: 0 }} />
              <span className={styles.planSectionTitle}>{def.title}</span>
              {result.loading && <span className={styles.spinner} style={{ marginLeft: 'auto' }} />}
              {!result.loading && result.places.length > 0 && <span className={styles.planCount} style={{ background: def.color + '22', color: def.color }}>{result.places.length}</span>}
            </div>
            {result.loading && <div className={styles.planSkeletons}>{[1,2,3].map(i => <div key={i} className={styles.planSkeleton} />)}</div>}
            {!result.loading && result.error && <div className={styles.planError}>Could not load data</div>}
            {!result.loading && result.places.map(place => (
              <button key={place.uid} type="button" className={styles.planRow} onClick={() => handlePlaceClick(place)}>
                {place.thumbnail
                  ? <img src={place.thumbnail} alt="" className={styles.planThumb} />
                  : <div className={styles.planThumbFallback} style={{ background: def.color + '22' }}><def.Icon size={14} style={{ color: def.color }} /></div>
                }
                <div className={styles.planRowInfo}>
                  <span className={styles.planRowName}>{place.title}</span>
                  <span className={styles.planRowDist}>{fmtDist(place.dist)}</span>
                </div>
                <ChevronRight size={13} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.2)' }} />
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );

  const renderSavedPanel = () => (
    <div className={styles.savedPanel}>
      {favorites.length === 0 ? (
        <div className={styles.emptyState}>
          <Heart size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No saved places yet</p>
          <p className={styles.emptyDesc}>Open any place and tap <strong>Save</strong> to bookmark it here.</p>
        </div>
      ) : (
        <div className={styles.resultsList}>{favorites.map(renderPlaceCard)}</div>
      )}
    </div>
  );

  return (
    <div className={styles.root}>
      {/* ── Compact header ── */}
      <header className={styles.header}>
        <Link href="/tools" className={styles.backLink} title="Back to tools"><ArrowLeft size={15} /></Link>
        <Globe2 size={16} className={styles.logoIcon} />
        <span className={styles.logoText}>Discover</span>
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <Search size={13} className={styles.searchIcon} />
          <input className={styles.searchInput} type="text" placeholder="Search any city or place…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          <button type="submit" className={styles.searchBtn} disabled={searching} aria-label="Search">
            {searching ? <span className={styles.spinner} /> : <ChevronRight size={15} />}
          </button>
        </form>
        <button type="button" className={styles.nearMeBtn} onClick={handleNearMe} disabled={locating} title="Discover near me">
          {locating ? <span className={styles.spinner} /> : <Navigation size={14} />}
          <span>Near me</span>
        </button>
      </header>

      {/* ── Body ── */}
      <div className={styles.body}>
        {/* Left panel */}
        <aside className={styles.panel}>
          {/* Tab bar */}
          <div className={styles.tabBar}>
            <button type="button" className={`${styles.tab} ${tab === 'explore' ? styles.tabActive : ''}`} onClick={() => { setTab('explore'); setSelected(null); setDetail(null); }}>
              <Globe size={14} /> Explore
            </button>
            <button type="button" className={`${styles.tab} ${tab === 'plan' ? styles.tabActive : ''}`} onClick={() => { setTab('plan'); setSelected(null); setDetail(null); }}>
              <Plane size={14} /> Plan
            </button>
            <button type="button" className={`${styles.tab} ${tab === 'saved' ? styles.tabActive : ''}`} onClick={() => { setTab('saved'); setSelected(null); setDetail(null); }}>
              <Heart size={14} /> Saved
              {favorites.length > 0 && <span className={styles.tabBadge}>{favorites.length}</span>}
            </button>
          </div>

          {/* Panel content */}
          <div className={styles.panelContent}>
            {selected
              ? renderDetail()
              : tab === 'explore' ? renderExplorePanel()
              : tab === 'plan'    ? renderPlanPanel()
              :                    renderSavedPanel()
            }
          </div>
        </aside>

        {/* Map */}
        <div className={styles.mapWrap}>
          <MapView
            center={mapCenter} zoom={mapZoom} places={mapPlaces}
            selectedUid={selected?.uid ?? null} userLocation={userLocation}
            pinnedLocation={pinnedLocation} pinMode={pinMode}
            onPlaceClick={handlePlaceClick} onMapMoveEnd={handleMapMoveEnd} onMapClick={handleMapClick}
          />

          {/* Pin mode banner */}
          {pinMode && (
            <div className={styles.pinBanner}>
              <Pin size={13} /> Click anywhere on the map to drop a pin
            </div>
          )}

          {/* Map hint */}
          {mapPlaces.length === 0 && !discovering && tab === 'explore' && !pinMode && (
            <div className={styles.mapHint}>Pan map then click <strong>Discover this area</strong></div>
          )}

          {/* Floating buttons */}
          <div className={styles.mapFloats}>
            <button type="button" className={styles.floatBtn} onClick={handleLocateMe} title="Show my location">
              {locating ? <span className={styles.spinnerDark} /> : <Crosshair size={16} />}
            </button>
            <button type="button" className={`${styles.floatBtn} ${pinMode ? styles.floatBtnActive : ''}`} onClick={() => setPinMode(v => !v)} title={pinMode ? 'Cancel pin mode' : 'Drop a pin on the map'}>
              {pinMode ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
