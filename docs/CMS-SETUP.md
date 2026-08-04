# Editing your site content without code

Your site now has a visual content editor at **`omidzanganeh.com/studio`**. Once it's connected,
changing a paragraph is: open the page, click the text, type, hit Publish. No GitHub, no code, no
waiting on anyone. It works on your phone too.

This document covers the one-time connection, then how to use it day to day.

---

## Part 1 — One-time setup (~5 minutes)

Until you do this, `/studio` shows a setup screen and your site keeps serving its current text.
Nothing is broken in the meantime, so there's no rush.

### 1. Create a free Sanity project

Go to **[sanity.io/manage](https://sanity.io/manage)** and sign in with Google or GitHub.
Click **Create project**. Name it anything — "omidzanganeh" works.

When it asks about a dataset, use the default name **`production`**.

### 2. Copy your Project ID

On the project overview page you'll see a **Project ID** — a short string like `7xk2p9ab`.
Copy it.

### 3. Add it to Vercel

In Vercel: your project → **Settings** → **Environment Variables**. Add two:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | the ID you just copied |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |

Tick **Production**, **Preview**, and **Development** for both.

### 4. Let your site talk to Sanity

Back in [sanity.io/manage](https://sanity.io/manage) → your project → **API** → **CORS origins**.
Click **Add CORS origin** twice:

- `https://omidzanganeh.com` — tick **Allow credentials**
- `http://localhost:3000` — tick **Allow credentials**

Skipping this is the single most common setup mistake. The Studio loads but can't save.

### 5. Redeploy

In Vercel, hit **Redeploy** on the latest deployment (or just push any commit).

Then open **`omidzanganeh.com/studio`** and sign in with the same account. You should see the
editor.

---

## Part 2 — Moving your current text into the editor

Your site currently reads from a built-in copy of the content. The Studio starts empty. Anything
you fill in **overrides** the built-in copy for that section; anything you leave empty keeps
showing what's there now.

That means you can migrate one section at a time and the site always looks complete.

Suggested order, easiest first:

1. **Site Settings** — tagline, contact details, footer line
2. **Currently Working On** — the three cards
3. **About Me** — your paragraphs
4. **Work Experience** — one entry per job
5. **Education** — one entry per degree

The current text lives in `sanity/fallback.ts` if you want to copy-paste from it rather than
retype. Bold text is written as `**like this**` in that file — in the Studio you'd just select the
words and press the **B** button.

---

## Part 3 — Day-to-day editing

### The sections

| In the Studio | Controls |
|---|---|
| **Site Settings** | Availability badge, tagline, phone, email, LinkedIn, StoryMap, location, footer |
| **About Me** | The paragraphs in your About section |
| **Currently Working On** | The three cards and their icons |
| **Work Experience** | Each job: company, title, badge, dates, location, bullets |
| **Education** | Each degree: title, school, date, GPA/award badges, coursework |

### Making text bold

Select the words, click **B** in the toolbar. Use it for metrics — "days to minutes",
"90% reduction" — the same way the current site does.

### Adding or removing a job

**Work Experience** → **Create new** for a new one, or open an existing one and use the
**⋮** menu → Delete.

The **Display order** field controls the sequence — lower numbers appear first. Olsson is `0`,
the next is `1`, and so on. To reorder, just change the numbers.

### Deleting a paragraph

Open **About Me**, click into the paragraph, select it all, delete. Or use the drag handle on the
left of the block to reorder paragraphs.

### Publishing

Nothing goes live until you press **Publish** (bottom right). Before that it's a draft only you
can see, so you can leave something half-written safely.

Changes appear on the live site within about a minute. If you want it instantly, redeploy in
Vercel.

---

## If something goes wrong

**The site still shows old text after publishing.**
Content is cached for 60 seconds. Wait a minute and hard-refresh. If it persists, check you hit
Publish and not just saved a draft.

**The Studio says "Unauthorized" or won't save.**
The CORS origin from step 4 is missing or doesn't have "Allow credentials" ticked.

**I deleted something important.**
Sanity keeps document history. Open the document → **⋮** menu → **Review changes** to see past
versions and restore one.

**I want to undo the whole thing.**
Remove `NEXT_PUBLIC_SANITY_PROJECT_ID` from Vercel and redeploy. The site immediately goes back to
the built-in content in `sanity/fallback.ts`. Nothing is lost.

---

## For reference — how it's wired

```
sanity/schemas/*.ts     what fields exist in the editor
sanity.config.ts        Studio config, mounts at /studio
app/studio/[[...tool]]/ the Studio route
sanity/lib/getContent.ts   fetches from Sanity, falls back per-section
sanity/fallback.ts      the built-in content
app/page.tsx            server component — fetches, passes to ResumeClient
app/ResumeClient.tsx    the UI (was page.tsx before the CMS)
```

The fallback is deliberate: if Sanity is down, misconfigured, or a section is empty, that section
renders from `fallback.ts` instead of breaking. Your site cannot go blank because of the CMS.
