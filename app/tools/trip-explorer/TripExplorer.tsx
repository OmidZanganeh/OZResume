'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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

interface PlaceDetail {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop: { page: string } };
}

const RADII = [
  { label: '1 km',  value: 1000 },
  { label: '5 km',  value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
];

async function geoSearch(lat: number, lon: number, radius: number): Promise<WikiPlace[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=40&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.query?.geosearch ?? []) as WikiPlace[];
}

async function batchThumbnails(places: WikiPlace[]): Promise<Record<number, string>> {
  if (!places.length) return {};
  const titles = places.map(p => p.title).join('|');
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&pithumbsize=140&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  const pages = data.query?.pages ?? {};
  const map: Record<number, string> = {};
  for (const page of Object.values(pages) as { pageid: number; thumbnail?: { source: string } }[]) {
    if (page.thumbnail?.source) map[page.pageid] = page.thumbnail.source;
  }
  return map;
}

async function fetchSummary(title: string): Promise<PlaceDetail> {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  return res.json();
}

export default function TripExplorer() {
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]);
  const [mapZoom, setMapZoom] = useState(13);
  const [places, setPlaces] = useState<WikiPlace[]>([]);
  const [selected, setSelected] = useState<WikiPlace | null>(null);
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [radius, setRadius] = useState(5000);
  const [discovering, setDiscovering] = useState(false);
  const [searching, setSearching] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const discover = useCallback(async (lat: number, lon: number, rad = radius) => {
    setDiscovering(true);
    setSelected(null);
    setDetail(null);
    try {
      const raw = await geoSearch(lat, lon, rad);
      const thumbs = await batchThumbnails(raw);
      setPlaces(raw.map(p => ({ ...p, thumbnail: thumbs[p.pageid] })));
    } catch {
      // silent
    } finally {
      setDiscovering(false);
    }
  }, [radius]);

  const handleDiscover = useCallback(() => {
    discover(mapCenter[0], mapCenter[1]);
  }, [mapCenter, discover]);

  const handlePlaceClick = useCallback(async (place: WikiPlace) => {
    setSelected(place);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await fetchSummary(place.title);
      setDetail(d);
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
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
        await discover(lat, lon);
      }
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  }, [searchQ, discover]);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setMapCenter([lat, lon]);
        setMapZoom(14);
        await discover(lat, lon);
        setLocating(false);
      },
      () => setLocating(false),
    );
  }, [discover]);

  const handleMapMoveEnd = useCallback((_lat: number, _lon: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleRadiusChange = useCallback((r: number) => {
    setRadius(r);
    if (places.length > 0) discover(mapCenter[0], mapCenter[1], r);
  }, [places.length, mapCenter, discover]);

  const fmt = (dist: number) =>
    dist < 1000 ? `${dist} m` : `${(dist / 1000).toFixed(1)} km`;

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
            placeholder="Search any city, landmark or country…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            aria-label="Search location"
          />
          <button type="submit" className={styles.searchBtn} disabled={searching} aria-label="Search">
            {searching ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            )}
          </button>
        </form>

        <div className={styles.headerBtns}>
          <button
            type="button"
            className={styles.nearMeBtn}
            onClick={handleNearMe}
            disabled={locating}
            title="Use my location"
          >
            {locating ? (
              <span className={styles.spinner} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
            )}
            <span className={styles.nearMeLabel}>Near me</span>
          </button>
        </div>
      </header>

      {/* ── Controls ── */}
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
        <button
          type="button"
          className={styles.discoverBtn}
          onClick={handleDiscover}
          disabled={discovering}
        >
          {discovering ? (
            <><span className={styles.spinner} /> Searching…</>
          ) : (
            <>✦ Discover here</>
          )}
        </button>
        {places.length > 0 && !discovering && (
          <span className={styles.countBadge}>{places.length} places</span>
        )}
      </div>

      {/* ── Main ── */}
      <div className={styles.main}>

        {/* Map */}
        <div className={styles.mapWrap}>
          <MapView
            center={mapCenter}
            zoom={mapZoom}
            places={places}
            selectedId={selected?.pageid ?? null}
            onPlaceClick={handlePlaceClick}
            onMapMoveEnd={handleMapMoveEnd}
          />
          {places.length === 0 && !discovering && (
            <div className={styles.mapHint}>
              Search a destination or click <strong>Discover here</strong> to find places nearby
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>

          {/* Detail panel */}
          {selected && (
            <div className={styles.detailPanel}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => { setSelected(null); setDetail(null); }}
              >
                ← All places
              </button>

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
                    <img
                      src={detail.thumbnail.source}
                      alt={detail.title}
                      className={styles.detailImg}
                    />
                  )}
                  <h2 className={styles.detailTitle}>{detail.title}</h2>
                  {selected.dist > 0 && (
                    <span className={styles.detailDist}>📍 {fmt(selected.dist)} away</span>
                  )}
                  <p className={styles.detailExtract}>{detail.extract}</p>
                  {detail.content_urls && (
                    <a
                      href={detail.content_urls.desktop.page}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.wikiLink}
                    >
                      Read full article on Wikipedia →
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Places list */}
          {!selected && (
            <div className={styles.placesList}>
              {places.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🌍</div>
                  <p className={styles.emptyTitle}>Ready to explore</p>
                  <p className={styles.emptyDesc}>
                    Search a city, pan to any location on the map, then hit{' '}
                    <strong>Discover here</strong> to find interesting places nearby.
                  </p>
                </div>
              ) : (
                places.map(place => (
                  <button
                    type="button"
                    key={place.pageid}
                    className={`${styles.placeCard} ${selected ? '' : ''}`}
                    onClick={() => handlePlaceClick(place)}
                  >
                    {place.thumbnail ? (
                      <img
                        src={place.thumbnail}
                        alt=""
                        className={styles.cardThumb}
                        aria-hidden="true"
                      />
                    ) : (
                      <div className={styles.cardThumbFallback}>📍</div>
                    )}
                    <div className={styles.cardInfo}>
                      <span className={styles.cardTitle}>{place.title}</span>
                      <span className={styles.cardDist}>{fmt(place.dist)}</span>
                    </div>
                    <svg
                      className={styles.cardChevron}
                      width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth={2}
                      strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true"
                    >
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
