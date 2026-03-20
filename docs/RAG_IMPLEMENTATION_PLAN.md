# Style Guider: RAG-Powered Chrome Extension

## Context

The original Style Guider is a React + Express web app with a hardcoded Economist Style Guide prompt. While it has a solid JSON parser with multi-stage recovery, the architecture is dated (Create React App, CommonJS, monolithic Express server, no persistence, no actual style guide documents).

**Goal**: Build a Chrome extension from scratch with a full RAG system that lets users upload any style guide text (AP, Economist, Dreyer's English, etc.), applies it to text on any webpage via inline annotations, and cites the specific style guide passage verbatim for each suggestion.

**User choices**: Chrome extension only (no web app), Supabase pgvector for storage, inline annotations on page, no auth.

**Fresh repo approach**: Build in a new repo to preserve the original for posterity. Start clean with modern tooling (Vite, TypeScript, ESM). Cherry-pick only the valuable parts from the existing codebase (parser recovery logic, prompt engineering patterns) rather than migrating legacy code.

---

## Architecture

```
Chrome Extension (Manifest V3)
  ├── Content Script (text selection → floating button → inline annotations)
  ├── Side Panel (style guide management, settings, full results)
  └── Background Service Worker (API coordination)
        │
        ▼
Vercel Serverless API (TypeScript, file-based routing)
  ├── POST /api/styleguides     → chunk + embed + store
  ├── GET  /api/styleguides     → list guides
  ├── DELETE /api/styleguides/[id] → delete guide + cascading chunk cleanup
  └── POST /api/analyze         → RAG retrieve → build prompt → Claude → verify citations → respond
        │
        ├── Supabase Postgres + pgvector (guide metadata + chunks + embeddings)
        ├── Voyage AI voyage-3-lite (512-dim embeddings)
        └── Anthropic Claude API (analysis with citation-aware prompt)
```

---

## Project Structure

```
style-guider/
  api/                              # Vercel serverless functions (TypeScript)
    styleguides/
      index.ts                      # POST (create) + GET (list)
      [id].ts                       # DELETE
    analyze.ts                      # Main RAG analysis endpoint
  lib/                              # Shared server-side modules
    rag/
      chunker.ts                    # Section-aware text chunking
      embedder.ts                   # Voyage AI embedding pipeline
      retriever.ts                  # pgvector similarity search
      promptBuilder.ts              # RAG-aware prompt with citation requirement
      citationVerifier.ts           # Post-process: verify citations are verbatim
    db/
      supabase.ts                   # Supabase client + query helpers
    parser/
      responseParser.ts             # Multi-stage JSON parser (ported from existing)
      parserValidator.ts            # JSON structure validation
      parserRecovery.ts             # Recovery from malformed responses
      types.ts                      # Shared types (Change, Segment, etc.)
  extension/                        # Chrome extension source
    manifest.json                   # Manifest V3
    background/
      service-worker.ts             # API calls, storage, coordination
    content/
      content-script.ts             # Text selection detection, inline annotations
      annotations.ts                # Shadow DOM annotation renderer
      styles.css                    # Annotation styles (injected into Shadow DOM)
    sidepanel/
      index.html
      main.tsx                      # React entry point
      components/
        App.tsx
        GuideSelector.tsx           # Dropdown to pick active guide
        GuideUpload.tsx             # Upload new style guide
        AnalysisResults.tsx         # Results display with citations
        ChangeRenderer.tsx          # Individual change with accept/reject + citation
        Settings.tsx                # Configuration
  supabase/
    migrations/
      001_initial_schema.sql        # Tables, indexes, pgvector setup
  package.json
  tsconfig.json
  vite.config.ts                    # Extension build config
  vercel.json                       # API routing
  .env.example                      # ANTHROPIC_API_KEY, VOYAGE_API_KEY, SUPABASE_URL, SUPABASE_KEY
```

---

## Phase 1: Backend — Supabase + RAG Pipeline

### 1.1 Supabase Schema

```sql
create extension if not exists vector;

create table style_guides (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  device_token text not null,         -- random UUID from client, no auth
  chunk_count integer default 0,
  created_at timestamptz default now()
);

create table style_guide_chunks (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid references style_guides(id) on delete cascade,
  section_title text,                  -- e.g. "Abbreviations", "Hyphens"
  chunk_text text not null,
  chunk_index integer not null,
  embedding vector(512),               -- voyage-3-lite dimension
  created_at timestamptz default now()
);

create index on style_guide_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on style_guide_chunks(guide_id);
```

### 1.2 Chunker (`lib/rag/chunker.ts`)

Section-aware splitting strategy:
1. Detect section headings via heuristics (short lines <60 chars, uppercase/title-case, followed by blank line, numbered patterns like "1.", "Chapter", markdown `##`)
2. Split within sections at paragraph boundaries (double newline)
3. Target 200–500 tokens per chunk (use `js-tiktoken` for counting)
4. ~50-token overlap between consecutive chunks in same section
5. Merge chunks under 100 tokens with adjacent chunk
6. Each chunk gets: `{ sectionTitle, chunkText, chunkIndex }`

### 1.3 Embedder (`lib/rag/embedder.ts`)

- Call Voyage AI `voyage-3-lite` REST API (no SDK needed, simple fetch)
- Batch chunks in groups of 20
- Return `{ chunkIndex, embedding: number[] }[]`
- Env var: `VOYAGE_API_KEY`

### 1.4 Retriever (`lib/rag/retriever.ts`)

1. Embed user text with same Voyage model
2. Query Supabase: `SELECT chunk_text, section_title, 1 - (embedding <=> $query_embedding) as similarity FROM style_guide_chunks WHERE guide_id = $id ORDER BY embedding <=> $query_embedding LIMIT 10`
3. Filter results below 0.3 similarity threshold
4. Return chunks with section titles and scores

### 1.5 Prompt Builder (`lib/rag/promptBuilder.ts`)

Builds the Claude prompt dynamically with retrieved style guide chunks in XML tags, requiring verbatim citations for every suggested change. Ports formatting instructions and examples from the existing `styleGuidePrompt.js`, updated to include the `citation` field.

### 1.6 Citation Verifier (`lib/rag/citationVerifier.ts`)

Post-processing step in `api/analyze.ts`:
- For each change with a `citation`, check if the citation text is a substring of any retrieved chunk (fuzzy match with >90% similarity to handle minor whitespace differences)
- Strip suggestions with non-matching citations
- Return verification stats alongside results

### 1.7 Parser (`lib/parser/`)

Port the valuable parts of the existing parser:
- `responseParser.ts` — Multi-stage cleaning (markdown removal, smart quote normalization, control char stripping) + JSON.parse
- `parserValidator.ts` — Validate JSON array structure, change object fields (`original`, `replacement`, `reason`, `citation`). Accept 3 or 4 properties.
- `parserRecovery.ts` — Fragment extraction and JSON repair for malformed responses
- `types.ts` — `type Segment = string | Change; type Change = { original: string; replacement: string; reason: string; citation?: string }`

### 1.8 API Endpoints

**`api/styleguides/index.ts`** — `POST`: receive `{ name, text, deviceToken }`, run chunker → embedder → store in Supabase, return `{ id, chunkCount }`. `GET`: receive `deviceToken` query param, return list of guides.

**`api/styleguides/[id].ts`** — `DELETE`: delete guide and chunks (cascade).

**`api/analyze.ts`** — `POST`: receive `{ text, guideId, deviceToken }`, run retriever → prompt builder → Claude API call → parse response → verify citations → return `{ segments, retrievedChunks, citationStats }`.

---

## Phase 2: Chrome Extension

### 2.1 Manifest V3

Standard Manifest V3 with permissions for `activeTab`, `storage`, `sidePanel`, and host permissions for the Vercel API domain.

### 2.2 Content Script — Inline Annotations (`extension/content/`)

**Vanilla TypeScript** (no React — avoid injecting a framework into host pages).

Flow:
1. `mouseup` listener → if `window.getSelection()` has >10 chars, show floating "Style Check" button anchored near selection
2. Button click → send `{ type: 'ANALYZE', text, selectionRange }` to background service worker
3. Receive results back → render annotations

**Annotation rendering** (`annotations.ts`):
- Shadow DOM container attached to `document.body` (prevents CSS conflicts with host page)
- For each change: strikethrough original + green replacement
- Hover tooltip: `reason` text + expandable `citation` block
- Accept (✓) / Reject (✕) buttons for each annotation

### 2.3 Background Service Worker (`extension/background/service-worker.ts`)

- On install: generate `deviceToken` UUID, store in `chrome.storage.local`
- Message handlers for ANALYZE, LIST_GUIDES, UPLOAD_GUIDE, DELETE_GUIDE, SET_ACTIVE_GUIDE
- Extension icon click → `chrome.sidePanel.open()`
- Store backend URL in `chrome.storage.local` (configurable in settings)

### 2.4 Side Panel — React + Vite (`extension/sidepanel/`)

Lightweight React app with components for:
- **GuideSelector**: Dropdown listing uploaded guides
- **GuideUpload**: File upload (.txt, .md) or paste text directly
- **AnalysisResults**: Results display with ChangeRenderer components
- **ChangeRenderer**: Individual change with accept/reject + citation display
- **Settings**: Backend URL, clear data

### 2.5 Build Config (`vite.config.ts`)

Multi-entry Vite build for Chrome extension with separate outputs for content script (IIFE), service worker (ESM), and side panel (React).

---

## Phase 3: Integration and Polish

### 3.1 Loading states
- Content script: subtle loading indicator near selected text during analysis
- Side panel upload: progress through chunking → embedding → storing stages

### 3.2 Error handling
- Network failures: retry with exponential backoff
- Supabase/Voyage/Claude errors: meaningful user-facing messages

### 3.3 Token budget management
- Estimate total tokens before calling Claude
- Reduce chunk count or warn user if over budget (~150k context)

---

## What to Port from Existing Codebase

| Existing Code | Action | Reason |
|---|---|---|
| `responseParser.js` core logic | Port to TypeScript | Multi-stage cleaning pipeline is genuinely valuable |
| `parserRecovery.js` fragment extraction | Port to TypeScript | Handles real edge cases in Claude's JSON output |
| `parserValidator.js` structure validation | Port + extend | Add `citation` field; remove "exactly 3 properties" constraint |
| `styleGuidePrompt.js` formatting rules | Incorporate into `promptBuilder.ts` | JSON formatting instructions and bad-example warnings are well-tested |
| `errorHandler.js` retry logic | Port pattern | Exponential backoff with jitter for API calls |
| `StyleGuideGenerator.js` renderChanges | Rewrite as `ChangeRenderer.tsx` | Adapt the accept/reject UX pattern, add citation display |

| Existing Code | Skip | Reason |
|---|---|---|
| CRA build system | Skip | Using Vite |
| Express server.js | Skip | Using Vercel file-based API routes |
| Error boundary components | Skip | Chrome extension doesn't use React error boundaries the same way |
| InstructionsModal | Skip | Replace with extension onboarding flow |
| Test harness components | Skip | Dev-only routes for testing errors |

---

## Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "js-tiktoken": "^1"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^5",
    "@crxjs/vite-plugin": "^2",
    "react": "^18",
    "react-dom": "^18",
    "@types/react": "^18",
    "@types/chrome": "latest",
    "vitest": "^1"
  }
}
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

---

## Testing Strategy

### Unit Tests (Vitest)
- **Chunker**: Section detection, token-range chunks, overlap, merge small chunks, edge cases
- **Embedder**: Batch logic, request format, error handling
- **Retriever**: Query construction, similarity threshold, empty results
- **Prompt Builder**: XML structure, citation requirement, token budget
- **Citation Verifier**: Exact match, whitespace-normalized, fuzzy >90%, fabricated citations stripped
- **Parser**: Valid JSON, malformed recovery, markdown-wrapped, smart quotes, control chars

### Integration Tests
- RAG pipeline round-trip: upload → chunk → embed → retrieve → analyze → verify citations
- Citation quality eval: >95% accuracy, <5% hallucination rate
- Retrieval quality eval: Recall@10 > 90%, MRR > 0.5

### Chrome Extension Tests
- Content script: selection detection, floating button, Shadow DOM isolation
- Side panel components: guide management, change rendering, settings persistence

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Vercel 60s timeout for upload + embed | Batch embed in parallel; for very large guides, return job ID and poll |
| Claude paraphrases instead of quoting verbatim | Post-process citation verification; strip non-matching; aggressive prompt wording |
| Content script CSS conflicts with host page | Shadow DOM for all injected UI |
| MV3 service worker terminated by Chrome | Store in-progress state in `chrome.storage.session` |
| Large style guides exceed token budget | Limit to top-10 chunks; estimate tokens; reduce if over budget |
| Complex DOM (contenteditable, iframes) | Start with simple text nodes; handle contenteditable as stretch goal |
| Style guide text quality (bad OCR) | Accept plain text only initially; show chunk preview during upload |
