Exercise images (your files)
----------------------------

1) Default naming
   For each move, the app looks for a file whose name matches a "slug" from the exact exercise
   name in the app (e.g. "Barbell Bench Press" -> barbell-bench-press, or the same with underscores
   e.g. barbell_bench_press — both are accepted).

   Place files here:
     public/exercise-images/<slug>.<ext>

   Tried in order: .png, .jpg, .jpeg, .webp, .gif

2) Optional manifest
   public/exercise-images/manifest.json can map a move to a different relative path or full URL.
   Example:
     { "barbell bench press": "chest/bench.png" }
   Use the exercise name (natural form) or the slug as the key; values can be
   "subfolder/file.jpg" or "https://example.com/pic.png".

3) After adding or renaming files, refresh the app (Vite may need a hard refresh in dev).
