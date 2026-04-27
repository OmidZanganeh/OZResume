/**
 * Reads a local clone of https://github.com/wrkout/exercises.json
 * and writes src/data/wrkoutExercises.json (Unlicense / public domain dataset).
 *
 * Prerequisite: git clone --depth 1 https://github.com/wrkout/exercises.json.git .cache/wrkout-ex-json
 * Or set WRKOUT_ROOT to the path that contains the `exercises` folder.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const WRKOUT = process.env.WRKOUT_ROOT || path.join(ROOT, '.cache', 'wrkout-ex-json');
const EX_DIR = path.join(WRKOUT, 'exercises');
const OUT = path.join(ROOT, 'src', 'data', 'wrkoutExercises.json');
const REPO = 'https://raw.githubusercontent.com/wrkout/exercises.json/master';

/** @param {string} t */
function mapWrkoutMuscleToGroup(m) {
  const t = String(m).toLowerCase();
  if (t === 'abdominals' || t.includes('abdominal')) return 'Core';
  if (t === 'chest') return 'Chest';
  if (t === 'quadriceps' || t === 'quads') return 'Quads';
  if (t === 'hamstrings') return 'Hamstrings';
  if (t === 'calves') return 'Calves';
  if (t === 'shoulders' || t === 'shoulder') return 'Shoulders';
  if (t === 'biceps' || t === 'bicep') return 'Biceps';
  if (t === 'triceps' || t === 'tricep') return 'Triceps';
  if (t.includes('forearm')) return 'Forearms';
  if (t === 'glutes' || t.includes('glute')) return 'Glutes';
  if (t === 'lats' || t === 'middle back' || t === 'lower back' || t === 'traps' || t.includes('back')) return 'Back';
  if (t === 'neck') return 'Mobility';
  if (t === 'adductors' || t === 'abductors') return 'Quads';
  return 'Core';
}

/** @param {any} ex */
function groupsFromMuscles(arr) {
  if (!Array.isArray(arr) || !arr.length) return [];
  return [...new Set(arr.map(mapWrkoutMuscleToGroup))];
}

/**
 * @param {any} ex
 * @param {string} folder
 */
function buildExerciseRecord(ex, folder) {
  const cat = (ex.category || 'strength').toLowerCase();
  let primary = 'Core';
  const prim = ex.primaryMuscles || [];
  if (cat === 'cardio') {
    primary = 'Cardio';
  } else if (cat === 'stretching' || cat === 'plyometrics') {
    primary = 'Mobility';
  } else if (prim.length) {
    primary = mapWrkoutMuscleToGroup(prim[0]);
  }
  const sec = groupsFromMuscles(ex.secondaryMuscles || [])
    .filter((g) => g !== primary);
  // Also add other primaries (some entries list multiple) as secondaries
  if (prim.length > 1) {
    for (const m of prim.slice(1)) {
      const g = mapWrkoutMuscleToGroup(m);
      if (g !== primary && !sec.includes(g)) sec.push(g);
    }
  }
  const hasImage = fs.existsSync(path.join(EX_DIR, folder, 'images', '0.jpg'));
  const imageUrl = hasImage
    ? `${REPO}/exercises/${encodeURIComponent(folder)}/images/0.jpg`
    : null;
  const equipmentRaw = ex.equipment;
  const wrkoutEquipment =
    equipmentRaw == null
      ? 'other'
      : typeof equipmentRaw === 'string'
        ? equipmentRaw.toLowerCase()
        : 'other';
  const levelRaw = ex.level;
  const wrkoutLevel =
    levelRaw == null
      ? undefined
      : typeof levelRaw === 'string'
        ? levelRaw.toLowerCase()
        : undefined;

  return {
    id: `wrkout-${folder}`,
    name: ex.name,
    primaryGroup: primary,
    secondaryGroups: sec.length ? sec : undefined,
    wrkoutFolder: folder,
    wrkoutImageUrl: imageUrl,
    wrkoutCategory: cat,
    wrkoutEquipment,
    wrkoutLevel: wrkoutLevel,
  };
}

if (!fs.existsSync(EX_DIR)) {
  console.error('Missing', EX_DIR, '\nRun: git clone --depth 1 https://github.com/wrkout/exercises.json.git .cache/wrkout-ex-json');
  process.exit(1);
}

const dirs = fs.readdirSync(EX_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
const out = [];
for (const d of dirs) {
  const folder = d.name;
  const fp = path.join(EX_DIR, folder, 'exercise.json');
  if (!fs.existsSync(fp)) continue;
  try {
    const ex = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (!ex.name) continue;
    out.push(buildExerciseRecord(ex, folder));
  } catch (e) {
    console.warn('Skip', folder, e);
  }
}

out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
fs.writeFileSync(OUT, JSON.stringify(out, null, 0), 'utf8');
console.log('Wrote', out.length, 'exercises to', path.relative(ROOT, OUT));
