# Roadmap

## Milestone 1: Pipeline Optimization & UI Synchronization

### Phase 1: AI Logic Unification (COMPLETED)
- [x] Merge advanced prompt logic from `ai.service.ts` into `native_rag.ts`.
- [x] Implement document classification check (Plan vs Non-Plan).
- [x] Enhance scoring model with strict NYC DOB rules.

### Phase 2: Status Synchronization (COMPLETED)
- [x] Update `compliance.service.ts` to emit all statuses expected by `UploadPlanModal.tsx`.
- [x] Add `EXTRACTING_DATA` and `RETRIEVING_RULES` statuses.

### Phase 3: Pricing & Credits (COMPLETED)
- [x] Update Pro Pack from 11 to 12 scans.
- [x] Update Enterprise Pack from 55 to 65 scans.
- [x] Add backward compatibility for old plan IDs in backend.
