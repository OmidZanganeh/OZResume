'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Globe, Landmark, UtensilsCrossed, Coffee, BedDouble, Trees, Palette,
  Clapperboard, Waves, Beer, ShoppingBag, HeartPulse, Heart, Plane,
  Search, Navigation, Crosshair, ArrowLeft, ChevronRight, Map,
  MapPin, Share2, BookOpen, ExternalLink, Pin, PinOff,
  Sun, Cloud, CloudRain, Snowflake, CloudLightning, CloudDrizzle,
  Wind, Droplets, CalendarDays, Info, Building2, Globe2, Clock,
  Phone, CreditCard, Languages, Car, Thermometer,
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

// ─── Category definitions ─────────────────────────────────────────────────────
interface Category {
  id: string;
  label: string;
  Icon: React.ElementType;
  color: string;
  source: 'wiki' | 'osm' | 'local' | 'plan';
  osmTemplate?: string;
}

const CATEGORIES: Category[] = [
  { id: 'all',           label: 'All',       Icon: Globe,         color: '#4f8ef7', source: 'wiki' },
  { id: 'landmarks',     label: 'Landmarks', Icon: Landmark,      color: '#6366f1', source: 'wiki' },
  { id: 'restaurants',   label: 'Eat',       Icon: UtensilsCrossed,color: '#f97316', source: 'osm', osmTemplate: 'node["amenity"="restaurant"](around:RADIUS,LAT,LON);' },
  { id: 'cafes',         label: 'Cafes',     Icon: Coffee,        color: '#d97706', source: 'osm', osmTemplate: 'node["amenity"~"^(cafe|coffee_shop)$"](around:RADIUS,LAT,LON);' },
  { id: 'hotels',        label: 'Stay',      Icon: BedDouble,     color: '#a855f7', source: 'osm', osmTemplate: 'node["tourism"~"^(hotel|hostel|guest_house|motel)$"](around:RADIUS,LAT,LON);' },
  { id: 'parks',         label: 'Nature',    Icon: Trees,         color: '#22c55e', source: 'osm', osmTemplate: 'node["leisure"~"^(park|nature_reserve|garden)$"](around:RADIUS,LAT,LON);way["leisure"~"^(park|nature_reserve|garden)$"](around:RADIUS,LAT,LON);' },
  { id: 'culture',       label: 'Culture',   Icon: Palette,       color: '#ec4899', source: 'osm', osmTemplate: 'node["tourism"~"^(museum|gallery|attraction)$"](around:RADIUS,LAT,LON);' },
  { id: 'entertainment', label: 'Fun',       Icon: Clapperboard,  color: '#f43f5e', source: 'osm', osmTemplate: 'node["amenity"~"^(cinema|theatre|arts_centre)$"](around:RADIUS,LAT,LON);node["leisure"~"^(amusement_arcade|water_park|escape_game)$"](around:RADIUS,LAT,LON);' },
  { id: 'beach',         label: 'Beach',     Icon: Waves,         color: '#06b6d4', source: 'osm', osmTemplate: 'node["natural"="beach"](around:RADIUS,LAT,LON);way["natural"="beach"](around:RADIUS,LAT,LON);node["leisure"="beach_resort"](around:RADIUS,LAT,LON);' },
  { id: 'nightlife',     label: 'Nightlife', Icon: Beer,          color: '#ef4444', source: 'osm', osmTemplate: 'node["amenity"~"^(bar|pub|nightclub)$"](around:RADIUS,LAT,LON);' },
  { id: 'shopping',      label: 'Shopping',  Icon: ShoppingBag,   color: '#14b8a6', source: 'osm', osmTemplate: 'node["shop"~"^(mall|department_store|marketplace|supermarket)$"](around:RADIUS,LAT,LON);node["amenity"="marketplace"](around:RADIUS,LAT,LON);' },
  { id: 'health',        label: 'Health',    Icon: HeartPulse,    color: '#10b981', source: 'osm', osmTemplate: 'node["amenity"~"^(hospital|pharmacy|clinic|doctors)$"](around:RADIUS,LAT,LON);' },
  { id: 'saved',         label: 'Saved',     Icon: Heart,         color: '#f43f5e', source: 'local' },
  { id: 'plan',          label: 'Trip Plan', Icon: Plane,         color: '#4f8ef7', source: 'plan' },
];

interface PlanSectionDef {
  id: string;
  Icon: React.ElementType;
  title: string;
  color: string;
  wiki: boolean;
  osmTemplate?: string;
}

const PLAN_SECTIONS: PlanSectionDef[] = [
  { id: 'landmarks',   Icon: Landmark,       title: 'Top Landmarks',  color: '#6366f1', wiki: true },
  { id: 'hotels',      Icon: BedDouble,      title: 'Where to Stay',  color: '#a855f7', wiki: false, osmTemplate: 'node["tourism"~"^(hotel|hostel|guest_house|motel)$"](around:5000,LAT,LON);' },
  { id: 'restaurants', Icon: UtensilsCrossed,title: 'Where to Eat',   color: '#f97316', wiki: false, osmTemplate: 'node["amenity"="restaurant"](around:5000,LAT,LON);' },
  { id: 'culture',     Icon: Palette,        title: 'Things to Do',   color: '#ec4899', wiki: false, osmTemplate: 'node["tourism"~"^(museum|gallery|attraction)$"](around:5000,LAT,LON);' },
  { id: 'parks',       Icon: Trees,          title: 'Nature & Parks', color: '#22c55e', wiki: false, osmTemplate: 'node["leisure"~"^(park|nature_reserve|garden)$"](around:5000,LAT,LON);way["leisure"~"^(park|nature_reserve|garden)$"](around:5000,LAT,LON);' },
  { id: 'cafes',       Icon: Coffee,         title: 'Cafes & Coffee', color: '#d97706', wiki: false, osmTemplate: 'node["amenity"~"^(cafe|coffee_shop)$"](around:5000,LAT,LON);' },
  { id: 'nightlife',   Icon: Beer,           title: 'Nightlife',      color: '#ef4444', wiki: false, osmTemplate: 'node["amenity"~"^(bar|pub|nightclub)$"](around:5000,LAT,LON);' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlaceDetail { title: string; extract: string; thumbnail?: { source: string }; content_urls?: { desktop: { page: string } }; }
interface Weather { temp: number; code: number; wind: number; }
interface DailyForecast { date: string; maxTemp: number; minTemp: number; code: number; precipProb: number; }
interface CountryInfo { name: string; flag: string; currencies: string; languages: string; timezones: string; emergency: string; drivingSide: string; }
interface OsmElement { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string>; }
interface PlanResult { sectionId: string; places: WikiPlace[]; loading: boolean; error: boolean; }

const RADII = [{ label: '1 km', value: 1000 }, { label: '5 km', value: 5000 }, { label: '10 km', value: 10000 }, { label: '25 km', value: 25000 }];

// ─── Weather helpers ──────────────────────────────────────────────────────────
function WeatherIcon({ code, size = 14 }: { code: number; size?: number }) {
  const props = { size, strokeWidth: 1.8 };
  if (code === 0) return <Sun {...props} className={styles.weatherIconSun} />;
  if (code <= 3) return <Cloud {...props} className={styles.weatherIconCloud} />;
  if (code <= 48) return <Wind {...props} />;
  if (code <= 57) return <CloudDrizzle {...props} className={styles.weatherIconRain} />;
  if (code <= 67) return <CloudRain {...props} className={styles.weatherIconRain} />;
  if (code <= 77) return <Snowflake {...props} className={styles.weatherIconSnow} />;
  if (code <= 82) return <CloudRain {...props} className={styles.weatherIconRain} />;
  return <CloudLightning {...props} className={styles.weatherIconStorm} />;
}

function wLabel(code: number) { if (code===0) return 'Clear'; if (code<=3) return 'Partly cloudy'; if (code<=48) return 'Foggy'; if (code<=57) return 'Drizzle'; if (code<=67) return 'Rainy'; if (code<=77) return 'Snowy'; if (code<=82) return 'Showers'; return 'Thunderstorm'; }

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000, f1 = lat1*Math.PI/180, f2 = lat2*Math.PI/180, df = (lat2-lat1)*Math.PI/180, dl = (lon2-lon1)*Math.PI/180;
  return Math.round(R*2*Math.atan2(Math.sqrt(Math.sin(df/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2), Math.sqrt(1-(Math.sin(df/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2))));
}
function fmtDist(m: number) { return m < 1000 ? `${m} m` : `${(m/1000).toFixed(1)} km`; }

function fmtDate(d: string) {
  const date = new Date(d + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── API ──────────────────────────────────────────────────────────────────────
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
    const d = (await res.json()).current;
    return d ? { temp: Math.round(d.temperature_2m), code: d.weather_code, wind: Math.round(d.wind_speed_10m) } : null;
  } catch { return null; }
}

async function fetchForecast(lat: number, lon: number): Promise<DailyForecast[]> {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=14`);
    const d = await res.json();
    if (!d.daily) return [];
    return (d.daily.time as string[]).map((date, i) => ({
      date,
      maxTemp: Math.round(d.daily.temperature_2m_max[i]),
      minTemp: Math.round(d.daily.temperature_2m_min[i]),
      code: d.daily.weather_code[i],
      precipProb: d.daily.precipitation_probability_max[i] ?? 0,
    }));
  } catch { return []; }
}

async function fetchCountryInfo(countryCode: string): Promise<CountryInfo | null> {
  try {
    const res = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,currencies,languages,timezones,flags,car`);
    const d = await res.json();
    const currencies = Object.values(d.currencies || {}).map((c: unknown) => (c as { name: string; symbol: string }).name + ' (' + (c as { name: string; symbol: string }).symbol + ')').join(', ');
    const languages = Object.values(d.languages || {}).join(', ');
    const timezones = (d.timezones || []).slice(0, 2).join(', ');
    return {
      name: d.name?.common ?? '',
      flag: d.flags?.svg ?? d.flags?.png ?? '',
      currencies,
      languages,
      timezones,
      emergency: d.idd?.root ? 'See local listings' : '',
      drivingSide: d.car?.side === 'left' ? 'Left-hand traffic' : 'Right-hand traffic',
    };
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
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [forecastVisible, setForecastVisible] = useState(false);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [favorites, setFavorites] = useState<WikiPlace[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [pinnedLocation, setPinnedLocation] = useState<[number, number] | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [radius, setRadius] = useState(5000);
  const [discovering, setDiscovering] = useState(false);
  const [searching, setSearching] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [osmError, setOsmError] = useState(false);
  const [travelDate, setTravelDate] = useState('');
  const [planCityQ, setPlanCityQ] = useState('');
  const [planResults, setPlanResults] = useState<PlanResult[]>([]);
  const [planning, setPlanning] = useState(false);
  const [planCity, setPlanCity] = useState('');
  const [planCountry, setPlanCountry] = useState<CountryInfo | null>(null);

  const currentCenter = useRef<[number, number]>(mapCenter);

  useEffect(() => {
    setFavorites(loadFavs());
    try {
      const p = new URLSearchParams(window.location.search);
      const lat = parseFloat(p.get('lat') || ''), lon = parseFloat(p.get('lon') || '');
      if (!isNaN(lat) && !isNaN(lon)) { setMapCenter([lat, lon]); setMapZoom(parseInt(p.get('z') || '14', 10)); }
    } catch { /* ignore */ }
  }, []);

  const getCat = useCallback((id: string) => CATEGORIES.find(c => c.id === id), []);
  const isFav = useCallback((uid: string) => favorites.some(f => f.uid === uid), [favorites]);
  const toggleFav = useCallback((place: WikiPlace) => {
    setFavorites(prev => {
      const next = prev.some(f => f.uid === place.uid) ? prev.filter(f => f.uid !== place.uid) : [...prev, place];
      saveFavs(next); return next;
    });
  }, []);

  const loadWeatherAndForecast = useCallback((lat: number, lon: number) => {
    fetchWeather(lat, lon).then(w => { if (w) setWeather(w); });
    fetchForecast(lat, lon).then(f => setForecast(f));
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
    loadWeatherAndForecast(lat, lon);
  }, [getCat, loadWeatherAndForecast]);

  const discoverCenter = useCallback(() => {
    const loc = pinnedLocation ?? mapCenter;
    discover(loc[0], loc[1], radius, category);
  }, [pinnedLocation, mapCenter, radius, category, discover]);

  const handleCategoryChange = useCallback((catId: string) => {
    setCategory(catId);
    setSelected(null); setDetail(null);
    if (catId === 'plan' || catId === 'saved') { if (catId === 'plan') setPlaces([]); return; }
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

  const geocodeAndDiscover = useCallback(async (query: string) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`);
    const data = await res.json();
    if (!data[0]) return null;
    const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon);
    const cc = data[0].address?.country_code;
    setMapCenter([lat, lon]); setMapZoom(13);
    if (cc) fetchCountryInfo(cc).then(c => setCountryInfo(c));
    loadWeatherAndForecast(lat, lon);
    return { lat, lon };
  }, [loadWeatherAndForecast]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const loc = await geocodeAndDiscover(searchQ);
      if (loc && category !== 'saved' && category !== 'plan') await discover(loc.lat, loc.lon, radius, category);
    } catch { /* silent */ }
    finally { setSearching(false); }
  }, [searchQ, radius, category, discover, geocodeAndDiscover]);

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

  const handleMapClick = useCallback((lat: number, lon: number) => {
    setPinnedLocation([lat, lon]);
    setPinMode(false);
  }, []);

  const handleMapMoveEnd = useCallback((lat: number, lon: number) => { currentCenter.current = [lat, lon]; }, []);

  const handleRadiusChange = useCallback((r: number) => {
    setRadius(r);
    if (places.length > 0 && category !== 'saved' && category !== 'plan') {
      const loc = pinnedLocation ?? mapCenter;
      discover(loc[0], loc[1], r, category);
    }
  }, [places.length, mapCenter, pinnedLocation, category, discover]);

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
    setPlanCountry(null);
    setPlanResults(PLAN_SECTIONS.map(s => ({ sectionId: s.id, places: [], loading: true, error: false })));
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(planCityQ)}&format=json&limit=1&addressdetails=1`);
      const geoData = await res.json();
      if (!geoData[0]) throw new Error('City not found');
      const lat = parseFloat(geoData[0].lat), lon = parseFloat(geoData[0].lon);
      const cc = geoData[0].address?.country_code;
      setMapCenter([lat, lon]); setMapZoom(13);
      loadWeatherAndForecast(lat, lon);
      if (cc) fetchCountryInfo(cc).then(c => setPlanCountry(c));

      await Promise.allSettled(PLAN_SECTIONS.map(async section => {
        try {
          let raw: WikiPlace[] = [];
          if (section.wiki) {
            raw = await fetchWikiPlaces(lat, lon, 5000, section.color, section.id);
            const thumbs = await fetchBatchThumbs(raw);
            raw = raw.map(p => ({ ...p, thumbnail: thumbs[p.uid] })).slice(0, 6);
          } else if (section.osmTemplate) {
            raw = (await fetchOsmPlaces(lat, lon, 5000, section.osmTemplate, section.color, section.id)).slice(0, 6);
          }
          setPlanResults(prev => prev.map(r => r.sectionId === section.id ? { ...r, places: raw, loading: false } : r));
        } catch {
          setPlanResults(prev => prev.map(r => r.sectionId === section.id ? { ...r, loading: false, error: true } : r));
        }
      }));
    } catch { setPlanResults([]); }
    finally { setPlanning(false); }
  }, [planCityQ, loadWeatherAndForecast]);

  // Forecast for selected travel date
  const selectedDateForecast = useMemo(() => {
    if (!travelDate || !forecast.length) return null;
    return forecast.find(f => f.date === travelDate) ?? null;
  }, [travelDate, forecast]);

  const mapPlaces = useMemo(() => {
    if (category === 'plan') return planResults.flatMap(r => r.places);
    if (category === 'saved') return favorites;
    return places;
  }, [category, places, favorites, planResults]);

  const activeList = category === 'saved' ? favorites : places;

  // ── Detail panel renderer ────────────────────────────────────────────────────
  const renderDetail = () => {
    if (!selected) return null;
    const cat = getCat(selected.category);
    return (
      <div className={styles.detailPanel}>
        <button type="button" className={styles.backBtn} onClick={() => { setSelected(null); setDetail(null); }}>
          <ArrowLeft size={14} /> Back
        </button>
        {selected.source === 'osm' && selected.osmTags && (
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
              {selected.osmTags.opening_hours && <div className={styles.osmRow}><span className={styles.osmKey}>Hours</span><span className={styles.osmHours}>{selected.osmTags.opening_hours}</span></div>}
              {(selected.osmTags['addr:street'] || selected.osmTags['addr:housenumber']) && <div className={styles.osmRow}><span className={styles.osmKey}>Address</span><span>{[selected.osmTags['addr:housenumber'], selected.osmTags['addr:street'], selected.osmTags['addr:city']].filter(Boolean).join(', ')}</span></div>}
              {(selected.osmTags.phone || selected.osmTags['contact:phone']) && <div className={styles.osmRow}><span className={styles.osmKey}>Phone</span><a href={`tel:${selected.osmTags.phone || selected.osmTags['contact:phone']}`} className={styles.osmLink}>{selected.osmTags.phone || selected.osmTags['contact:phone']}</a></div>}
              {(selected.osmTags.website || selected.osmTags['contact:website']) && <div className={styles.osmRow}><span className={styles.osmKey}>Website</span><a href={selected.osmTags.website || selected.osmTags['contact:website']} target="_blank" rel="noopener noreferrer" className={styles.osmLink}>{(selected.osmTags.website || selected.osmTags['contact:website'] || '').replace(/^https?:\/\/(www\.)?/, '').substring(0, 35)}</a></div>}
              {selected.osmTags.stars && <div className={styles.osmRow}><span className={styles.osmKey}>Stars</span><span className={styles.starRow}>{Array.from({ length: Math.min(5, parseInt(selected.osmTags.stars)) }).map((_, i) => <span key={i} className={styles.starFilled}>★</span>)}</span></div>}
            </div>
            <div className={styles.detailActions}>
              <button type="button" className={styles.actionBtn} onClick={() => openDirections(selected.lat, selected.lon)}><Navigation size={13} /> Directions</button>
              <a href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lon}`} target="_blank" rel="noopener noreferrer" className={styles.actionBtnOutline}><ExternalLink size={12} /> Google Maps</a>
              <button type="button" className={`${styles.actionBtnOutline} ${isFav(selected.uid) ? styles.actionBtnFav : ''}`} onClick={() => toggleFav(selected)}><Heart size={12} fill={isFav(selected.uid) ? 'currentColor' : 'none'} /> {isFav(selected.uid) ? 'Saved' : 'Save'}</button>
              <button type="button" className={styles.actionBtnOutline} onClick={handleShare}><Share2 size={12} /> {copied ? 'Copied!' : 'Share'}</button>
            </div>
          </div>
        )}
        {selected.source === 'wiki' && (
          <>
            {detailLoading ? (
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
            ) : null}
          </>
        )}
      </div>
    );
  };

  const renderPlaceCard = (place: WikiPlace) => {
    const cat = getCat(place.category);
    return (
      <button type="button" key={place.uid} className={styles.placeCard} onClick={() => handlePlaceClick(place)}>
        {place.thumbnail
          ? <img src={place.thumbnail} alt="" className={styles.cardThumb} aria-hidden="true" />
          : <div className={styles.cardThumbFallback} style={{ background: place.color + '22' }}>{cat && <cat.Icon size={20} style={{ color: place.color }} />}</div>
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

  return (
    <div className={styles.root}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.logoWrap}>
          <Link href="/tools" className={styles.backLink} title="Back to Tools"><ArrowLeft size={16} /></Link>
          <Globe2 size={18} className={styles.logoIcon} />
          <span className={styles.logoText}>Discover</span>
        </div>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <Search size={14} className={styles.searchIcon} />
          <input className={styles.searchInput} type="text" placeholder="Search city, landmark, country…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          <button type="submit" className={styles.searchBtn} disabled={searching} aria-label="Search">
            {searching ? <span className={styles.spinner} /> : <ChevronRight size={16} />}
          </button>
        </form>

        <button type="button" className={styles.nearMeBtn} onClick={handleNearMe} disabled={locating} title="Discover near my location">
          {locating ? <span className={styles.spinner} /> : <Navigation size={14} />}
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
            <cat.Icon size={13} className={styles.catIconSvg} />
            <span className={styles.catLabel}>{cat.label}</span>
            {cat.id === 'saved' && favorites.length > 0 && <span className={styles.catCount}>{favorites.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Controls + weather + forecast ── */}
      <div className={styles.controls}>
        <span className={styles.controlLabel}>Radius</span>
        {RADII.map(r => (
          <button key={r.value} type="button" className={`${styles.radiusBtn} ${radius === r.value ? styles.radiusBtnActive : ''}`} onClick={() => handleRadiusChange(r.value)}>{r.label}</button>
        ))}

        {/* Pin mode toggle */}
        <button
          type="button"
          className={`${styles.pinModeBtn} ${pinMode ? styles.pinModeBtnActive : ''}`}
          onClick={() => setPinMode(v => !v)}
          title={pinMode ? 'Click anywhere on the map to set a pin' : 'Click to enable pin mode — pick any location on the map'}
        >
          {pinMode ? <PinOff size={13} /> : <Pin size={13} />}
          <span>{pinMode ? 'Pinning…' : 'Pin loc'}</span>
        </button>

        {pinnedLocation && (
          <button type="button" className={styles.clearPinBtn} onClick={() => setPinnedLocation(null)} title="Remove pinned location">
            <MapPin size={12} /> Clear pin
          </button>
        )}

        {category !== 'saved' && category !== 'plan' && (
          <button type="button" className={styles.discoverBtn} onClick={discoverCenter} disabled={discovering}>
            {discovering ? <><span className={styles.spinner} /> Searching…</> : <>Discover {pinnedLocation ? 'pin' : 'here'}</>}
          </button>
        )}

        {category !== 'plan' && activeList.length > 0 && !discovering && <span className={styles.countBadge}>{activeList.length}</span>}

        {weather && (
          <button type="button" className={`${styles.weatherChip} ${forecastVisible ? styles.weatherChipActive : ''}`} onClick={() => setForecastVisible(v => !v)} title="Toggle 14-day forecast">
            <WeatherIcon code={weather.code} size={13} /> {weather.temp}°C
            <Wind size={11} style={{ opacity: 0.6 }} /> {weather.wind}
          </button>
        )}
      </div>

      {/* ── 14-day Forecast strip ── */}
      {forecastVisible && forecast.length > 0 && (
        <div className={styles.forecastStrip}>
          {/* Travel date highlight */}
          {selectedDateForecast && (
            <div className={styles.forecastDateBadge}>
              <CalendarDays size={13} />
              <span>{fmtDate(selectedDateForecast.date)}</span>
              <WeatherIcon code={selectedDateForecast.code} size={13} />
              <span>{selectedDateForecast.maxTemp}°/{selectedDateForecast.minTemp}°</span>
              <Droplets size={11} /><span>{selectedDateForecast.precipProb}%</span>
            </div>
          )}
          <div className={styles.forecastDays}>
            {forecast.map(day => (
              <button
                key={day.date}
                type="button"
                className={`${styles.forecastDay} ${travelDate === day.date ? styles.forecastDayActive : ''}`}
                onClick={() => setTravelDate(prev => prev === day.date ? '' : day.date)}
                title={wLabel(day.code)}
              >
                <span className={styles.forecastDayLabel}>{new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <WeatherIcon code={day.code} size={16} />
                <span className={styles.forecastDayMax}>{day.maxTemp}°</span>
                <span className={styles.forecastDayMin}>{day.minTemp}°</span>
                {day.precipProb > 20 && <span className={styles.forecastPrecip}><Droplets size={9} />{day.precipProb}%</span>}
              </button>
            ))}
          </div>
          <div className={styles.forecastDateInput}>
            <CalendarDays size={13} />
            <input type="date" className={styles.datePicker} value={travelDate} min={new Date().toISOString().split('T')[0]} max={forecast[forecast.length - 1]?.date} onChange={e => setTravelDate(e.target.value)} />
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <div className={styles.main}>

        {/* Map */}
        <div className={styles.mapWrap}>
          {pinMode && <div className={styles.pinModeOverlay}><Pin size={14} /> Click anywhere on the map to drop a pin</div>}
          <MapView
            center={mapCenter} zoom={mapZoom} places={mapPlaces}
            selectedUid={selected?.uid ?? null} userLocation={userLocation}
            pinnedLocation={pinnedLocation} pinMode={pinMode}
            onPlaceClick={handlePlaceClick} onMapMoveEnd={handleMapMoveEnd} onMapClick={handleMapClick}
          />
          <button type="button" className={styles.locateFloatBtn} onClick={goToLocation} title="Show my location on map">
            {locating ? <span className={styles.spinnerDark} /> : <Crosshair size={16} />}
          </button>
          {mapPlaces.length === 0 && !discovering && !pinMode && category !== 'saved' && category !== 'plan' && (
            <div className={styles.mapHint}>Select a category then click <strong>Discover here</strong></div>
          )}
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>

          {selected && renderDetail()}

          {/* ── Trip Planner ── */}
          {!selected && category === 'plan' && (
            <div className={styles.planContent}>
              <div className={styles.planHeader}>
                <Plane size={16} className={styles.planHeaderIcon} />
                <div>
                  <span className={styles.planHeaderTitle}>Trip Planner</span>
                  <span className={styles.planHeaderSub}>Full destination guide in one click</span>
                </div>
              </div>
              <form className={styles.planForm} onSubmit={handlePlanSearch}>
                <div className={styles.planInputWrap}>
                  <Search size={13} className={styles.planSearchIcon} />
                  <input className={styles.planInput} type="text" placeholder="Enter destination (e.g. Tokyo, Rome)…" value={planCityQ} onChange={e => setPlanCityQ(e.target.value)} />
                </div>
                <button type="submit" className={styles.planBtn} disabled={planning}>
                  {planning ? <><span className={styles.spinner} /> Planning…</> : <><Plane size={13} /> Plan My Trip</>}
                </button>
              </form>

              {/* Country info */}
              {planCity && planCountry && (
                <div className={styles.countryCard}>
                  {planCountry.flag && <img src={planCountry.flag} alt={planCountry.name} className={styles.countryFlag} />}
                  <div className={styles.countryDetails}>
                    <span className={styles.countryName}>{planCity}, {planCountry.name}</span>
                    <div className={styles.countryGrid}>
                      <div className={styles.countryRow}><CreditCard size={11} /><span>{planCountry.currencies}</span></div>
                      <div className={styles.countryRow}><Languages size={11} /><span>{planCountry.languages}</span></div>
                      <div className={styles.countryRow}><Clock size={11} /><span>{planCountry.timezones}</span></div>
                      <div className={styles.countryRow}><Car size={11} /><span>{planCountry.drivingSide}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Weather for plan */}
              {planCity && weather && (
                <div className={styles.planWeatherBanner}>
                  <WeatherIcon code={weather.code} size={14} />
                  <span><strong>{planCity}</strong> — {weather.temp}°C · {wLabel(weather.code)}</span>
                  <Wind size={12} /> <span>{weather.wind} km/h</span>
                </div>
              )}

              {planResults.length === 0 && !planning && (
                <div className={styles.planEmpty}>
                  <Globe2 size={40} className={styles.planEmptyIcon} />
                  <p>Enter a destination to get a full travel guide — accommodation, dining, sightseeing, nightlife and more.</p>
                </div>
              )}

              {planResults.map(result => {
                const def = PLAN_SECTIONS.find(s => s.id === result.sectionId)!;
                return (
                  <div key={result.sectionId} className={styles.planSection}>
                    <div className={styles.planSectionHeader} style={{ borderLeftColor: def.color }}>
                      <def.Icon size={14} style={{ color: def.color, flexShrink: 0 }} />
                      <span className={styles.planSectionTitle}>{def.title}</span>
                      {result.loading && <span className={styles.spinner} style={{ marginLeft: 'auto' }} />}
                      {!result.loading && result.places.length > 0 && <span className={styles.planSectionCount} style={{ background: def.color + '22', color: def.color }}>{result.places.length}</span>}
                    </div>
                    {result.loading && <div className={styles.planSkeletons}>{[1,2,3].map(i => <div key={i} className={styles.planSkeleton} />)}</div>}
                    {!result.loading && result.error && <div className={styles.planSectionError}>Could not load data</div>}
                    {!result.loading && result.places.map(place => (
                      <button key={place.uid} type="button" className={styles.planPlaceRow} onClick={() => handlePlaceClick(place)}>
                        {place.thumbnail
                          ? <img src={place.thumbnail} alt="" className={styles.planThumb} aria-hidden="true" />
                          : <div className={styles.planThumbFallback} style={{ background: def.color + '22' }}><def.Icon size={16} style={{ color: def.color }} /></div>
                        }
                        <div className={styles.planPlaceInfo}>
                          <span className={styles.planPlaceName}>{place.title}</span>
                          <span className={styles.planPlaceDist}>{fmtDist(place.dist)}</span>
                        </div>
                        <ChevronRight size={13} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.2)' }} />
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Saved ── */}
          {!selected && category === 'saved' && (
            <div className={styles.placesList}>
              {favorites.length === 0 ? (
                <div className={styles.emptyState}>
                  <Heart size={36} className={styles.emptyIcon} />
                  <p className={styles.emptyTitle}>No saved places yet</p>
                  <p className={styles.emptyDesc}>Open any place and tap <strong>Save</strong> to bookmark it here.</p>
                </div>
              ) : favorites.map(renderPlaceCard)}
            </div>
          )}

          {/* ── Regular list ── */}
          {!selected && category !== 'plan' && category !== 'saved' && (
            <div className={styles.placesList}>
              {osmError && <div className={styles.osmError}><Info size={13} /> OpenStreetMap data is slow. Try again or reduce the radius.</div>}
              {activeList.length === 0 && !discovering ? (
                <div className={styles.emptyState}>
                  {(() => { const cat = getCat(category); return cat ? <cat.Icon size={36} className={styles.emptyIcon} style={{ color: cat.color }} /> : null; })()}
                  <p className={styles.emptyTitle}>Ready to explore</p>
                  <p className={styles.emptyDesc}>Pan the map to your destination, then click <strong>Discover {pinnedLocation ? 'pin' : 'here'}</strong>.</p>
                </div>
              ) : activeList.map(renderPlaceCard)}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
