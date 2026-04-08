# Roadmap: DumpIt

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (34 plans) — shipped 2026-04-07
- 📋 **v1.1** — Planning (2 phases)

---

## ✅ v1.0 MVP (SHIPPED 2026-04-07)

Full milestone details: [`.planning/milestones/v1.0-ROADMAP.md`](.planning/milestones/v1.0-ROADMAP.md)

| Phase | Goal | Plans | Status |
|-------|------|-------|--------|
| 1. Core Dump | Dump input, card view, local storage, app shell | 12/12 | ✅ Complete |
| 2. Organization | Projects, tags+AI, sidebar filters, drag-drop | 7/7 | ✅ Complete |
| 3. Export & Reference | Search, multi-select, markdown export, ZIP | 6/6 | ✅ Complete |
| 4. AI Summaries | Daily/weekly summaries, in-app view, export | 6/6 | ✅ Complete |
| 5. Gap: Delete Confirmation | ConfirmDialog wired to DumpCard | 1/1 | ✅ Complete |
| 6. Gap: ExpandedCard Wiring | CardGrid→ExpandedCard props wired | 1/1 | ✅ Complete |
| 7. Gap: Phase 02 Verification | 02-VERIFICATION.md produced (14/14) | 1/1 | ✅ Complete |

**Requirements:** 41/41 v1 requirements satisfied (verified)

---

## 📋 v1.1 Project-based Storage (PLANNING)

**Goal:** Enforce project-first storage architecture -- all dump content must exist within a project vault

**Granularity:** standard
**Requirements mapped:** 10/10

### Phases

- [ ] **Phase 1: Vault Foundation** - Create/open vaults with security hardening and dump input guard
- [ ] **Phase 2: File + Metadata Layer** - File type subdirectory storage and serialized metadata persistence

### Phase Details

#### Phase 1: Vault Foundation

**Goal:** Users can create/open vaults and app enforces vault-first workflow

**Depends on:** Nothing (first phase)

**Requirements:** VAULT-01, VAULT-02, VAULT-03, VAULT-04, VAULT-05, FILE-02, APP-01

**Success Criteria** (what must be TRUE):

1. User sees a welcome screen with "Create Vault" and "Open Vault" options when app starts with no vault selected
2. User can create a new vault by selecting an empty directory, which initializes `.dumpere/` marker, `metadata.json`, and type subdirectories
3. User can open an existing vault by selecting its root directory, with validation for `.dumpere/` marker and valid `metadata.json`
4. Dump input is disabled or hidden when no vault is open (vault-first enforcement)
5. App enforces single-instance operation, focusing existing window if second instance launches

**Plans:**
- [x] 01-01-PLAN.md — Main Process Foundation (single-instance lock, vault-service, IPC handlers, store extension)
- [x] 01-02-PLAN.md — Renderer Foundation (preload bridge, useVault hook, WelcomeScreen, VaultPlaceholder, App.tsx conditional)

**Wave Structure:**

| Wave | Plans | Description |
|------|-------|-------------|
| 1 | 01-01 | Main process foundation |
| 2 | 01-02 | Renderer foundation |

**UI hint:** yes

---

#### Phase 2: File + Metadata Layer

**Goal:** Files are stored by type in vault subdirectories with centralized, serialized metadata

**Depends on:** Phase 1

**Requirements:** FILE-01, META-01, META-02

**Success Criteria** (what must be TRUE):

1. Files dropped into dump are copied to the correct vault subdirectory (images/videos/audio/files) based on MIME type
2. Files are stored with UUID filenames to avoid collisions, while original filename is preserved in metadata
3. All dump metadata (text, files, tags, order) is stored in `.dumpere/metadata.json` with the defined schema
4. Metadata writes are serialized through a write queue, preventing race conditions from concurrent updates
5. App configuration (recent vaults, window bounds) is stored separately from vault data in electron userData

**Plans:**
- [x] 02-01-PLAN.md — Service Layer (metadata-service.ts with serialized write queue, file-service.ts vault-awareness)
- [x] 02-02-PLAN.md — IPC Integration (dump:create/dump:get handlers, preload bridge extension)

**Wave Structure:**

| Wave | Plans | Description |
|------|-------|-------------|
| 1 | 02-01 | Service layer (metadata + file services) |
| 2 | 02-02 | IPC handlers + preload bridge |

---

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Vault Foundation | 0/2 | Not started | - |
| 2. File + Metadata Layer | 0/2 | Not started | - |

### Coverage

| Requirement | Phase | Description |
|-------------|-------|-------------|
| VAULT-01 | Phase 1 | No-Vault Welcome Screen |
| VAULT-02 | Phase 1 | Create Vault |
| VAULT-03 | Phase 1 | Open Existing Vault |
| VAULT-04 | Phase 1 | Vault Path Security |
| VAULT-05 | Phase 1 | Single Instance Lock |
| FILE-02 | Phase 1 | Dump Input Guard |
| APP-01 | Phase 1 | App Config Separation |
| FILE-01 | Phase 2 | File Type Subdirectory Storage |
| META-01 | Phase 2 | Vault Metadata Schema |
| META-02 | Phase 2 | Serialized Metadata Write Queue |

---

### Phase Order Rationale

1. **Vault Foundation first** because vault-first is a modal constraint -- app cannot function without a vault
2. **File + Metadata second** because file storage and metadata persistence require vault path infrastructure from Phase 1
3. This maps cleanly to the security-first approach: validation and security hardening (Phase 1) before file operations (Phase 2)

---

*Last updated: 2026-04-08 — Phase 2 plans created (2 plans, 2 waves)*
