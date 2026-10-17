# DDAS v2.1 — Data Download Duplication Alert System

> Minor Project · Shri Vaishnav Institute of Information Technology, Indore · 2025–26

A full-stack MERN application that detects duplicate file downloads/uploads
**across users in a shared organisation** using four layers of fingerprinting:

1. **Exact** — SHA-256 over raw bytes.
2. **Near-duplicate** — perceptual / content-normalised hash that survives
   re-saving, re-compression, and small edits.
3. **Cross-modal (NEW in v2.1)** — the same text content in a PDF, DOCX,
   PPTX, HTML page or TXT file is detected as a single duplicate.
4. **Partial duplicate (NEW in v2.1)** — content-defined chunking (CDC)
   with a rolling Gear hash. Catches files that share a large fraction of
   bytes with an existing file even though neither hash above matched
   (e.g. a 50 MB dataset whose first 40 MB matches an existing one).

The duplicate check still runs in the **browser** first, so exact-match
duplicates never consume bandwidth.

---

## What's new in v2.1

1. **Content-Defined Chunking (Feature #2)** — every uploaded file is split
   into variable-size chunks using a FastCDC-style rolling Gear hash. Chunks
   are SHA-256'd and indexed in a new `FileChunk` collection per organisation.
   On upload, the system queries every existing file in the org that shares
   any chunk with the candidate, computes the byte-overlap, and raises a
   `partial` duplicate alert when overlap ≥ 30% (configurable). One Mongo
   query regardless of how many files exist.
2. **Cross-Modal Detection (Feature #4)** — the text-normalised content hash
   is now derived from PDF, DOCX, **PPTX (new)**, HTML and TXT/MD/CSV. All
   formats share a single `kind: 'text'` namespace, so a PDF and a DOCX of
   the same paper collide as one near-duplicate. Each FileRecord carries a
   `sourceFormat` so cross-format matches can be labelled in the UI/email.
3. **New diagnostics** — `GET /api/files/chunks/stats` reports total bytes
   stored, unique bytes after CDC, dedup ratio, and bytes saved. The
   `/api/files/engines` endpoint now also returns CDC parameters and the
   active partial-dup threshold.

### Honest caveats

* CDC is most useful for text-like / structured data (PDFs, DOCX, CSVs, code,
  logs). For already-compressed media (JPEG, MP4, encrypted ZIP) entropy is
  maximal and chunk boundaries rarely repeat across files — partial-dup
  detection on those formats will mostly score 0%. That is expected, not a
  bug. The other three detection layers still apply.
* Partial detection requires the **bytes** to be uploaded — it only runs at
  `/api/files/upload`, not at the pre-upload `/api/files/check` probe.

## What was in v2

1. **Client-side pre-upload hash check** — browser-side SHA-256, no bytes
   uploaded until a server-side miss is confirmed.
2. **Organisations / shared registries** with invite codes.
3. **Near-duplicate detection** via `sharp`, `pdf-parse`, `mammoth`.
4. **Hardening** — fixed the role-escalation bug and the desktop agent's
   self-referential duplicate records.
5. New endpoints: `/api/orgs/*`, `/api/files/check`, `/api/files/org`,
   `/api/files/engines`.

---

## Project Structure

```
ddas-v2/
├── server/
│   ├── config/db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── FileRecord.js        # +chunks, +sourceFormat, +overlapPercent, +crossModal
│   │   ├── DuplicateAlert.js    # +matchKind:'partial', +overlapPercent, +crossModal
│   │   ├── FileChunk.js         # NEW (v2.1) — per-chunk org-scoped index
│   │   └── Organization.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── files.js             # +partial-dup detection, +cross-modal, +chunks/stats
│   │   ├── admin.js
│   │   └── organizations.js
│   ├── middleware/auth.js
│   ├── utils/
│   │   ├── hashEngine.js
│   │   ├── contentHash.js       # +pptx (jszip), +html, +txt/md/csv, +sourceFormat
│   │   ├── chunking.js          # NEW (v2.1) — Gear-hash CDC + overlap math
│   │   └── mailer.js            # partial + cross-modal email templates
│   ├── scripts/smoke.js         # NEW — offline sanity check for chunker + contentHash
│   ├── uploads/                 # auto-created
│   ├── .env.example
│   └── index.js
│
├── client/
│   ├── src/
│   │   ├── utils/clientHash.js
│   │   ├── pages/Upload.jsx         # surfaces partial/cross-modal banners
│   │   ├── pages/Alerts.jsx         # per-match-type icons & badges
│   │   ├── pages/Organization.jsx
│   │   └── components/ui/DuplicateAlert.jsx   # exact/near/cross-modal/partial
│   └── package.json
│
└── desktop-agent/
    ├── watcher.js
    └── package.json
```

---

## Quick Start (run in VS Code)

You need: **Node.js ≥ 18**, **MongoDB** (local install or Atlas), and a
**Gmail account with an App Password** if you want email alerts to work.

### 1. Backend

```bash
cd server
cp .env.example .env             # fill in MONGO_URI, JWT_SECRET, EMAIL_USER/PASS
npm install                      # installs sharp, pdf-parse, mammoth, jszip
npm run smoke                    # offline sanity check (no DB needed)
npm run dev                      # http://localhost:5000
```

> **Heads-up on `sharp`** — it ships a native binary per OS. On most modern
> machines `npm install` will fetch the right pre-built binary automatically.
> If it fails on your machine, the server still boots — near-duplicate
> detection for *images* is just disabled. Exact-match, text content-hash,
> cross-modal, and CDC partial detection keep working. Verify which engines
> are live by hitting `GET /api/files/engines` after logging in.

### 2. Frontend

```bash
cd client
npm install
npm start                        # http://localhost:3000
```

### 3. Desktop agent (optional)

```bash
cd desktop-agent
cp .env.example .env             # set DDAS_EMAIL / DDAS_PASSWORD
npm install
node watcher.js                  # watches ~/Downloads
```

### First-time setup

1. In `server/.env`, set `BOOTSTRAP_ADMIN_EMAIL` to the email you'll register
   first. That user becomes the admin; everyone else is a regular user.
2. Register on the web UI. On the sign-up form choose **Create organisation**
   and name it.
3. Share the **invite code** (shown on the Organisation page) with your
   teammates so they can join the same org.
4. **Demo each detection layer**:
   - Upload `report.pdf`. Upload it again → *exact* alert.
   - Re-save `report.pdf` from a different PDF tool (different bytes, same
     text) and upload → *near* alert.
   - Export `report.pdf` to `report.docx` and upload → *cross-format* alert.
   - Take a large dataset, copy it, add a few hundred rows, upload the new
     one → *partial* alert with overlap percentage.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST   | `/api/auth/register` | Public | Register (+ optional org create/join) |
| POST   | `/api/auth/login` | Public | Login, get JWT |
| GET    | `/api/auth/me` | User | Current user (with org) |
| PUT    | `/api/auth/me` | User | Update profile |
| POST   | `/api/files/check` | User | Pre-upload hash check |
| POST   | `/api/files/upload` | User | Upload + dual-hash + CDC check |
| GET    | `/api/files` | User | My file history |
| GET    | `/api/files/org` | User | All files in my organisation |
| GET    | `/api/files/engines` | User | Active engines + CDC params |
| GET    | `/api/files/chunks/stats` | User | **NEW (v2.1)** — dedup stats |
| GET    | `/api/files/alerts` | User | My duplicate alerts |
| PATCH  | `/api/files/alerts/:id/read` | User | Mark alert read |
| GET    | `/api/orgs/me` | User | My organisation |
| GET    | `/api/orgs/me/members` | User | Org members |
| POST   | `/api/orgs` | User | Create organisation |
| POST   | `/api/orgs/join` | User | Join by invite code |
| POST   | `/api/orgs/leave` | User | Leave organisation |
| GET    | `/api/admin/stats` | Admin | Dashboard statistics |
| GET    | `/api/admin/users` | Admin | All users |
| GET    | `/api/admin/files` | Admin | All files |
| GET    | `/api/admin/alerts` | Admin | All alerts |

---

## How detection works (v2.1)

```
User picks file
   ↓
[ BROWSER ] crypto.subtle.digest('SHA-256', buffer)        ← Web Crypto
   ↓
POST /api/files/check  { hash, source:'web' }              ← no file bytes
   ↓
[ SERVER ] FileRecord.findByHash(hash, user.organization)
   ↓
  ┌─ MATCH? → record DuplicateAlert(matchKind:'exact', source:'check')
  │           respond { isDuplicate:true }
  │
  └─ NO MATCH → respond { isDuplicate:false }
                ↓
                [ BROWSER ] proceeds to actual upload (multipart)
                ↓
                [ SERVER ] re-hashes for integrity
                            + computeContentHash(buffer, mime, name)
                            ├─ image → pHash via sharp           ──┐
                            ├─ pdf   → text via pdf-parse  ─┐      │
                            ├─ docx  → text via mammoth    │ NEW  ├─→ kind='text'
                            ├─ pptx  → text via jszip      │ in   │   single namespace
                            ├─ html  → text (tag-strip)    │ v2.1 │   ⇒ cross-modal hits
                            └─ txt/md/csv → raw text       ─┘      │
                                                                   ↓
                            + chunkBuffer(buffer) → [c1,c2,...]    ┘
                ↓
                FileRecord.findByContentHash(...)   ← cross-format aware
                ↓
                  ┌─ EXACT MATCH    → 'exact'   alert  (409)
                  ├─ TEXT MATCH     → 'near'   alert  (409)
                  │                   crossModal=true when sourceFormats differ
                  ├─ PHASH MATCH    → 'near'   alert  (409)
                  │
                  └─ NO HASH MATCH  → run CDC overlap query (NEW v2.1)
                                      │
                                      ├─ overlap ≥ 30%  → 'partial' alert (409)
                                      │                   with overlapPercent
                                      │
                                      └─ no candidate    → save file +
                                                           index its chunks
                                                           in FileChunk
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend          | React 18 + Tailwind CSS + Web Crypto API |
| Backend           | Node.js + Express.js |
| Database          | MongoDB + Mongoose |
| Auth              | JWT + bcryptjs |
| Exact hash        | Node `crypto` (SHA-256), browser `crypto.subtle` |
| Perceptual / text | `sharp` (image pHash), `pdf-parse`, `mammoth`, `jszip` (PPTX) |
| CDC partial-dup   | Custom FastCDC-lite (Gear hash) + SHA-256 chunk fingerprints |
| Email             | Nodemailer + Gmail SMTP |
| Desktop agent     | chokidar + node-notifier |
| Deployment        | Render (backend) + Vercel (frontend) |
