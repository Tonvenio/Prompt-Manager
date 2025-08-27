# Implementation Plan: Animated Library View

## Branch Name
feat/library-view-animated

## Background and Motivation
We want a new Library view that matches the provided screenshot: a left navigation sidebar, a searchable list in the middle, and a rich details panel on the right. Animations should feel smooth and delightful using our existing GSAP utilities.

## Key Challenges and Analysis
- Achieving a faithful 3‑pane layout in the App Router while keeping components server/client boundaries clean.
- Reusing existing animation helpers (`components/AnimatedSection`, `components/AnimatedFilters`, `hooks/useAnimations.ts`).
- Keeping strict TypeScript and lint rules green.

## High-level Task Breakdown
- [x] Create feature branch from `main` named `feat/library-view-animated`.
- [x] Scaffold `app/library/page.tsx` with 3‑pane layout.
- [x] Implement animated sidebar with filters and create button.
- [x] Implement animated list with search and selection state.
- [x] Implement animated right details panel including header actions and step card.
- [x] Polish styles to closely match the screenshot (spacing/typography/pills).
- [x] Build and lint until green; fix any regressions.
- [x] Open draft PR and capture demo video/gif.

## Acceptance Criteria
- The new route is available at `/library` and renders without errors.
- Sidebar: shows Type, Filters, Categories; filter pills animate in.
- List: search input animates in; list items stagger-in and highlight when selected.
- Details: animates on selection change with slide/opacity; includes Use button and a step card similar to the screenshot.
- No new TypeScript errors in added files; overall project still builds.

## Testing Strategy
- Manual: navigate to `/library`, try searching, selecting items, and observe animations.
- Lint/build: `npm run build` must succeed; run `npm run lint` if needed.

## Project Status Board
- [x] Branch created
- [x] Scaffolded route
- [x] Sidebar implemented
- [x] List + search implemented
- [ ] Details panel implemented
- [ ] Styling polish
- [x] Build/lint green
- [x] Draft PR open

## Executor's Feedback or Assistance Requests
- None yet. Will request feedback after first slice is visible.

---

## Feature Parity Plan: bring `/prompts` features into `/library` (without touching `/prompts`)

### Inventory of features in `/prompts`
- Data loading and grouping
  - Load from `/api/langfuse/list?tag=...` (Langfuse-backed) and build category options from `tags` with prefixes: `Context`, `Jurisdiction`, `Area_or_PG`, `Tool`, `SubmittedBy`, `Language`.
  - Groupings: My Prompts (SubmittedBy == current user), Practice Group Prompts (from profile.areas), Community Prompts; with a "New Prompts" (last 30 days) subgroup.
- Filtering, search and view modes
  - Full-text search over `name`, `tags`, `lastConfig`, `lastPromptText` and label-based exclusions.
  - Category filters (single and multi-select) and clickable `TagPills` to set filters.
  - View toggle: `table` vs `bento` cards.
- Social signals
  - Fetch `/api/comments/summary` to display reactions/comments counts per prompt.
- Actions
  - Open details (`/prompts/[name]`).
  - Add/Update tags via `AddTagButton` and `/api/langfuse/update-tags`.
  - Create Prompt modal: POST to `/api/langfuse/update` with new name, text, labels, tags.
  - Extras on details page: Improve, Compare, Learn, Use Prompt, Share, Comments.
- Personalization and onboarding
  - Fetch `/api/auth/me` (username + profile areas/languages); `UserMenu` to set defaults; `OnboardingTip`.
- Analytics
  - `trackClient` events (e.g., `prompt_click`).

### Library counterparts: UX and architecture
- Keep `/library` self-contained. Reuse components only if they are client-safe; otherwise create thin wrappers local to `app/library/`.
- Avoid importing server-only helpers in client; all Langfuse access goes through existing API routes under `app/api/langfuse/*`.

### Phased implementation (vertical slices)

#### Phase A: List, filters, search, grouping parity
- Implement client state in `app/library/page.tsx` mirroring `/prompts/page.tsx`:
  - Load list from `/api/langfuse/list` and tag summary from `/api/comments/summary`.
  - Build `optionsByCategory` and apply category filters + full-text search + label exclusions.
  - Group the middle list into sections: My, Practice Group, Community (+ New in last 30 days).
  - Add view toggle (`table`/`bento`) using `AnimatedViewToggle` and re-use `AnimatedPromptCard` for bento.
- AC
  - Filtering and search produce identical results to `/prompts` for the same dataset.
  - Section counts and “New” subgroup logic match.

#### Phase B: Details panel parity
- Replace placeholder details pane with a dynamic details view for selected prompt (stay on `/library`):
  - Show title, description (from Langfuse prompt content if available), tags, author, practice, access.
  - Actions: Use (open `UsePromptModal` inline), Share (re-use `SharePromptButton` behavior in a side sheet/modal), Improve (open `ImproveModal`), Learn (open `LearnPromptModal`), Compare (open `CompareModal`).
  - Comments embed: create `LibraryComments` wrapper that reuses `/app/prompts/[name]/Comments.tsx` logic but scoped to the right pane and driven by `selected.name`.
- AC
  - All actions function without navigation; API calls succeed; comments post and react.

#### Phase C: Tag management and creation
- Integrate `TagPills` and `AddTagButton` inside the details pane and list rows.
- Add "Create Prompt" flow to `/library` header or sidebar, reusing the idea modal fields; POST to `/api/langfuse/update`; refresh list; optionally auto-select the new item.
- AC
  - Tags can be added from `/library`. Creating a prompt returns to `/library` with new item visible and selectable.

#### Phase D: Personalization, onboarding, analytics
- Load `/api/auth/me` to drive “My” section and Practice Group detection; add `UserMenu` access in `/library` top bar.
- Show `OnboardingTip` within `/library`.
- Emit analytics via `trackClient` (e.g., `library_open`, `library_select`, `library_use_prompt`).
- AC
  - Preferences mirror `/prompts`; analytics events appear in server logs.

### API and data flow (server-side)
- Langfuse access via existing server routes:
  - List: `GET /api/langfuse/list` (already returns `PromptMeta[]`).
  - Update (create/rename with text/labels/tags): `POST /api/langfuse/update`.
  - Update tags: `POST /api/langfuse/update-tags`.
  - Tags list: `GET /api/langfuse/tags` (optional for tag pickers).
- Social: `GET /api/comments/summary`, `GET/POST /api/comments/[name]` for details pane.
- Auth/profile: `GET /api/auth/me`.
- All server routes already use `lfHost`, `lfAuthHeader`, `lfJson` and keep secrets server-side.

### Components to reuse vs wrap
- Reuse (client-safe): `AnimatedSection`, `AnimatedPromptCard`, `AnimatedFilters` (`AnimatedSearchBar`, `AnimatedViewToggle`), `TagPills`, `AddTagButton`, `UsePromptModal`, `ImproveModal`, `CompareModal`, `LearnPromptModal`, `Comments` (via wrapper), `UserMenu`, `OnboardingTip`.
- Create wrappers under `app/library/` if propping differs or to avoid tight coupling with `/prompts` paths.

### Non-goals
- Do not change `/prompts/**` behavior or files.
- Do not expose Langfuse secrets in client code.

### Risks and mitigations
- Importing server-only modules into client components → Mitigate by using API routes and lazy dynamic imports for heavy modals.
- Animations performance with long lists → Use virtualized list later if needed; keep stagger animations short.

### Milestones and tracking
- A1: Parity list/search/filter/grouping in `/library`
- B1: Details actions (Use, Share, Improve, Learn, Compare) work inline
- C1: Tagging and Create Prompt from `/library`
- D1: Personalization + analytics parity
