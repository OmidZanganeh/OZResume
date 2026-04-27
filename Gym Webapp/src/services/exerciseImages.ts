/**
 * Images: 1) wrkoutImageUrl (GitHub raw from wrkout/exercises.json) 2) manifest.json 3) public/exercise-images/ slugs
 * @see https://github.com/wrkout/exercises.json
 */
import type { Exercise } from '../data/exerciseTypes';

type LocalImageManifest = Record<string, string>;

export type ExerciseImageMeta = {
  url: string;
  credit: string;
};

/** Order: common photo formats first; png after (avoids failed .png noise in Network when only jpg exists). */
const EXTENSIONS = ['jpg', 'jpeg', 'webp', 'png', 'gif'] as const;

const EXTENSIONS_HINT = '.jpg, .jpeg, .webp, .png, or .gif' as const;

function assetUrl(path: string): string {
  const trimmed = path.replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}${trimmed}`;
}

const imageUrlByExerciseName = new Map<string, string | null>();
const fileProbeBySlug = new Map<string, string | null>();

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/['".,()/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Filename stem, e.g. "Barbell Bench Press" -> "barbell-bench-press" */
export function toImageSlug(value: string) {
  return normalizeName(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

let localManifestPromise: Promise<LocalImageManifest> | null = null;

async function loadLocalManifest(): Promise<LocalImageManifest> {
  if (!localManifestPromise) {
    localManifestPromise = fetch(assetUrl('exercise-images/manifest.json'))
      .then((response) => (response.ok ? response.json() : {}))
      .then((raw: LocalImageManifest) => {
        const out: LocalImageManifest = {};
        for (const [k, v] of Object.entries(raw)) {
          if (k.startsWith('_') || typeof v !== 'string') continue;
          out[normalizeName(k)] = v;
          out[toImageSlug(k)] = v;
        }
        return out;
      })
      .catch(() => ({}));
  }
  return localManifestPromise;
}

function resolveLocalPath(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const trimmed = pathOrUrl.replace(/^\/+/, '');
  if (trimmed.startsWith('exercise-images/')) return assetUrl(trimmed);
  return assetUrl(`exercise-images/${trimmed.replace(/^exercise-images\//, '')}`);
}

/** Manifest value can be: "my-pic.png", "folder/a.jpg", "https://..." */
function tryManifest(ourName: string, manifest: LocalImageManifest): string | null {
  const keys = [normalizeName(ourName), toImageSlug(ourName)];
  for (const k of keys) {
    if (manifest[k]) return resolveLocalPath(manifest[k]!);
  }
  return null;
}

/** Stems to try on disk: canonical slug (hyphens) and underscore variant, e.g. ab-wheel-rollout and ab_wheel_rollout */
function fileNameStemsForSlug(slug: string): string[] {
  const withUnderscores = slug.replace(/-/g, '_');
  return Array.from(new Set([slug, withUnderscores].filter(Boolean)));
}

/**
 * Check that a URL returns a body (Vite dev server often does not handle HEAD for /public files well).
 * Cancels the stream so we do not download the full file.
 */
async function urlExists(path: string): Promise<boolean> {
  try {
    const r = await fetch(path, { method: 'GET', cache: 'no-cache' });
    if (!r.ok) return false;
    await r.body?.cancel();
    return true;
  } catch {
    return false;
  }
}

/**
 * First matching file wins. Tries hyphen slug, then underscores. Result is cached per slug.
 */
async function firstExistingBySlug(slug: string): Promise<string | null> {
  if (!slug) return null;
  const cacheKey = slug;
  if (fileProbeBySlug.has(cacheKey)) {
    return fileProbeBySlug.get(cacheKey) ?? null;
  }
  for (const stem of fileNameStemsForSlug(slug)) {
    for (const ext of EXTENSIONS) {
      const path = assetUrl(`exercise-images/${stem}.${ext}`);
      if (await urlExists(path)) {
        fileProbeBySlug.set(cacheKey, path);
        return path;
      }
    }
  }
  fileProbeBySlug.set(cacheKey, null);
  return null;
}

export async function resolveExerciseImageUrl(ourName: string): Promise<string | null> {
  if (imageUrlByExerciseName.has(ourName)) {
    return imageUrlByExerciseName.get(ourName) ?? null;
  }
  const manifest = await loadLocalManifest();
  const fromManifest = tryManifest(ourName, manifest);
  if (fromManifest) {
    imageUrlByExerciseName.set(ourName, fromManifest);
    return fromManifest;
  }
  const fromDisk = await firstExistingBySlug(toImageSlug(ourName));
  imageUrlByExerciseName.set(ourName, fromDisk);
  return fromDisk;
}

export async function resolveImageForExercise(ex: Pick<Exercise, 'name' | 'wrkoutImageUrl'>): Promise<string | null> {
  const { name, wrkoutImageUrl } = ex;
  if (imageUrlByExerciseName.has(name)) {
    return imageUrlByExerciseName.get(name) ?? null;
  }
  const manifest = await loadLocalManifest();
  const fromManifest = tryManifest(name, manifest);
  if (fromManifest) {
    imageUrlByExerciseName.set(name, fromManifest);
    return fromManifest;
  }
  if (wrkoutImageUrl) {
    imageUrlByExerciseName.set(name, wrkoutImageUrl);
    return wrkoutImageUrl;
  }
  const fromDisk = await firstExistingBySlug(toImageSlug(name));
  imageUrlByExerciseName.set(name, fromDisk);
  return fromDisk;
}

export async function getExerciseImageMap(exercises: Pick<Exercise, 'name' | 'wrkoutImageUrl'>[]) {
  const byName = new Map<string, Pick<Exercise, 'name' | 'wrkoutImageUrl'>>();
  for (const ex of exercises) {
    if (!byName.has(ex.name)) byName.set(ex.name, ex);
  }
  const unique = [...byName.values()];
  if (unique.length === 0) return {} as Record<string, ExerciseImageMeta>;

  const results = await Promise.all(
    unique.map(async (ex) => {
      const url = await resolveImageForExercise(ex);
      if (!url) return [ex.name, null] as const;
      const meta: ExerciseImageMeta = {
        url,
        credit: ex.wrkoutImageUrl ? 'wrkout/exercises.json' : 'Your image',
      };
      return [ex.name, meta] as const;
    }),
  );

  const mapping: Record<string, ExerciseImageMeta> = {};
  for (const [name, meta] of results) {
    if (meta) mapping[name] = meta;
  }
  return mapping;
}

export function getLocalImageFileHint(exerciseName: string) {
  const stem = toImageSlug(exerciseName);
  return `${stem} (${EXTENSIONS_HINT})`;
}

export function getExpectedImagePathDescription() {
  return `public/exercise-images/<name-slug> (${EXTENSIONS_HINT})`;
}
