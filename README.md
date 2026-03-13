# DRFramingAgent

DRFramingAgent is a two-part TypeScript application for design research framing. It combines a React frontend for interactive exploration with an Express backend that connects Zotero, Notion, and OpenAI-driven generation. The system is built around two linked workflows:

- `Framing Workspace`: takes a user-written research context and generates a structured framing package including research question, background, purpose, method, result, contribution, abstracts, and title.
- `Constellation Map`: visualizes and edits the keyword constellation that shapes the framing pipeline.

The repository is organized as a small monorepo with separate `frontend` and `backend` apps.

## System Architecture

At a high level, the architecture looks like this:

1. Zotero provides paper metadata used to profile papers and derive candidate keywords.
2. Notion acts as the persistent store for both keyword records and saved framing outputs.
3. The backend builds keyword graphs, runs framing logic, and exposes APIs for the frontend.
4. The frontend offers two operator-facing views: one for keyword constellation curation and one for framing generation.

### Runtime responsibilities

- `frontend`
  - React + Vite single-page app
  - Hosts the chat/framing workspace and the constellation map UI
  - Calls backend APIs for keyword, graph, Zotero, and framing operations

- `backend`
  - Express API server
  - Integrates with Zotero, Notion, and OpenAI
  - Owns deterministic keyword/profile logic and LLM-backed framing generation
  - Serves the frontend build in production via static hosting fallback

### External dependencies

- `Zotero`
  - Source of papers and metadata for ingestion/profile flows
- `Notion DB2`
  - Keyword store used by the constellation system
- `Notion DB1`
  - Storage target for saved framing outputs
- `OpenAI`
  - Used by framing, abstract, title, and refinement steps

## Core Data Flows

### 1. Zotero to Constellation

This flow powers keyword discovery and graph updates.

1. The frontend triggers Zotero ingestion or paper profiling.
2. `backend/src/routes/zotero.ts` fetches Zotero items or profiles a paper.
3. `runProfilePaper()` uses `paperEpistemicProfiler` to estimate orientation, artifact role, and suggested keywords.
4. `keywordConceptRefiner` filters and merges raw suggestions.
5. Refined keywords are written into Notion DB2 through `notionService`.
6. The frontend reloads `/api/keywords` and `/api/graph` to refresh the constellation UI.

### 2. Active Keywords to Framing Output

This flow powers the main framing generator.

1. A user enters research context in the Framing Workspace.
2. `POST /api/framing/run` fetches all keywords from Notion DB2 and filters to active ones.
3. `runPipeline()` executes the framing pipeline:
   - `constellationKeywordSync`
   - `artifactRoleInfluencer`
   - `constellationRuleEngine`
   - `framingGeneratorMVP`
   - `constellationAbstractGenerator`
   - `titleGenerator`
4. The backend returns a structured framing response to the frontend.
5. The user can optionally save the final framing to Notion DB1 with `POST /api/framing/save`.

### 3. Keyword Graph Construction

The constellation graph is assembled on request rather than stored as a separate graph database.

1. `GET /api/graph` loads keyword records from Notion DB2.
2. `graphService` transforms keywords into nodes and edges.
3. Edge scores are post-processed with time-decay logic.
4. The frontend renders the graph and filters it down to active nodes and connected active edges.

## Codebase Map

### Root

- `backend/`: API server, services, skills, and pipeline logic
- `frontend/`: React application and view-layer logic
- `railway.toml`: deployment configuration for Railway

### Backend

- `backend/src/server.ts`
  - Express app setup, middleware, API mounting, static serving
- `backend/src/routes/`
  - `zotero.ts`: fetch, profile, and ingest Zotero papers
  - `keywords.ts`: read/write/update keyword records in Notion DB2
  - `graph.ts`: build the constellation graph and neighbor queries
  - `framing.ts`: run, refine, and save framing outputs
- `backend/src/services/`
  - `zoteroReader.ts`: Zotero API access
  - `notionService.ts`: Notion DB1/DB2 read/write operations
  - `llmService.ts`: OpenAI wrapper
  - `graphService.ts`: graph construction and scoring
- `backend/src/pipeline/runPipeline.ts`
  - Central orchestration entrypoint for framing generation
- `backend/src/skills/`
  - Domain-specific transformation steps used inside the pipeline
- `backend/src/schema/`
  - Shared schema/types for framing and constellation concepts

### Frontend

- `frontend/src/App.tsx`
  - Two-tab shell that switches between framing and constellation views
- `frontend/src/pages/FramingPage.tsx`
  - Framing workspace UI
- `frontend/src/pages/ConstellationPage.tsx`
  - Constellation graph + inspector + Zotero ingest UI
- `frontend/src/components/`
  - `ChatPanel`: user input and framing execution
  - `FramingCard`: framing result display/edit/save
  - `ConstellationCanvas`: graph visualization
  - `KeywordInspector`: selected keyword editing
  - `EpistemicSummary`: aggregated orientation/artifact summaries
  - `ZoteroIngest`: ingestion entrypoint from the UI
- `frontend/src/api/`
  - Thin wrappers around backend endpoints
- `frontend/src/schema/` and `frontend/src/types/`
  - Frontend-side contracts and data types
- `frontend/src/design/theme.ts`
  - Shared visual theme tokens

## Main API Surface

### Health

- `GET /api/health`

### Zotero

- `GET /api/zotero/items`
- `POST /api/zotero/profile`
- `POST /api/zotero/ingest`

### Keywords

- `GET /api/keywords`
- `POST /api/keywords`
- `PATCH /api/keywords/:id`

### Graph

- `GET /api/graph`
- `GET /api/graph/neighbors/:id?k=5`

### Framing

- `POST /api/framing/run`
- `POST /api/framing/save`
- `POST /api/framing/refine`

## Local Development

### Prerequisites

- Node.js 20+ recommended
- npm
- A Notion integration with access to both databases
- Zotero API credentials
- An OpenAI API key

### Environment variables

The backend expects a `.env` file based on [`backend/.env.example`](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/.env.example).

Required variables:

- `NOTION_API_KEY`
- `NOTION_DB1_ID`
- `NOTION_DB2_ID`
- `ZOTERO_API_KEY`
- `ZOTERO_USER_ID` or `ZOTERO_GROUP_IDS`
- Optional: `ZOTERO_COLLECTION_URL` to force a single collection source
- `OPENAI_API_KEY`
- `PORT` (defaults to `3001`)

### Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Run in development

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

By default the backend listens on port `3001`. The frontend runs with Vite's dev server and calls the backend through the frontend API layer.

### Build and verification

Backend:

```bash
cd backend
npm run build
npm run typecheck
```

Frontend:

```bash
cd frontend
npm run build
npm run lint
```

## Operational Notes

### Persistence model

- Keywords are not local fixtures; they are loaded from Notion DB2 at runtime.
- Framing results can be persisted to Notion DB1.
- Because Notion is the source of truth for keywords, UI state should be treated as a cached view over remote records.

### Pipeline behavior

- The framing endpoint refuses to run if there are no active keywords in DB2.
- The pipeline mixes deterministic preprocessing with LLM generation.
- Keyword activation and weighting directly influence both graph visibility and framing bias.

### Production serving

- The backend is already set up to serve a built frontend from `backend/public`.
- Any non-API route falls back to `index.html`, so the backend can act as the SPA host in deployment.
- `backend/Dockerfile` and `railway.toml` suggest Railway/container deployment is the intended production path.

## Recommended Reading Order

For a new developer, this sequence gives the fastest mental model:

1. Start with [`frontend/src/App.tsx`](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/frontend/src/App.tsx) to understand the two top-level product surfaces.
2. Read [`backend/src/server.ts`](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/server.ts) to see the API shape.
3. Read [`backend/src/pipeline/runPipeline.ts`](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/pipeline/runPipeline.ts) to understand framing orchestration.
4. Follow the relevant route file in [`backend/src/routes/`](/Users/yutingcheng/Library/CloudStorage/GoogleDrive-futurethingslab0314@gmail.com/My%20Drive/Future%20Things%20Lab/website/DRFramingAgent/backend/src/routes) depending on the feature you are changing.
5. Finish with the paired frontend page and component tree for the UI you are editing.

## Maintenance Tips

- Keep frontend and backend contracts aligned; several payload shapes are mirrored in both apps.
- If graph behavior changes, verify both `graphService` and the filtering logic in `ConstellationPage`.
- If framing output changes, review both pipeline skills and the frontend rendering/edit-save flow.
- If Notion schema changes, expect downstream changes in both route handlers and UI assumptions.
