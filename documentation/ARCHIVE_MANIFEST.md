# Archive Manifest - Cleanup Directories

**Date:** 2026-02-10  
**Purpose:** Document obsolete directories for archiving from active codebase

---

## 1. archive/ Directory

**Path:** `archive/`  
**Reason:** Old cleanup documentation from February 2026  
**Contents:**
- `resume_legacy/` - 16 legacy resume files documenting past corrections
- `root_cleanup_2026_02/` - 60+ files from February 2026 cleanup audit
- `StorycoreIcone.png` - Legacy icon file

**Subdirectories/Files:**
```
archive/
├── StorycoreIcone.png (legacy icon)
├── resume_legacy/
│   ├── RESUME_AJOUT_GEMMA3_ET_AUTRES.txt
│   ├── RESUME_AUTO_DETECTION_VISUEL.txt
│   ├── RESUME_CORRECTION_PARSING_LLM.txt
│   ├── RESUME_GESTION_SEQUENCES_VISUEL.txt
│   ├── RESUME_PROBLEME_LLM.txt
│   ├── RESUME_RECHERCHE_PROBLEMES_SIMILAIRES.txt
│   ├── RESUME_ULTRA_COMPACT_PARSING.txt
│   ├── RESUME_ULTRA_COMPACT.txt
│   ├── RESUME_VISUEL_CORRECTIFS_LLM.txt
│   ├── RESUME_VISUEL_CORRECTION_ENDPOINT.txt
│   ├── RESUME_VISUEL_CORRECTION_MODELES.txt
│   ├── RESUME_VISUEL_FINAL_100_POURCENT.txt
│   ├── RESUME_VISUEL_FINAL.txt
│   ├── RESUME_VISUEL_LLM_FINAL.txt
│   ├── RESUME_VISUEL_SERVICES_CORRIGES.txt
│   └── RESUME_VISUEL_TOUS_SERVICES_CORRIGES.txt
└── root_cleanup_2026_02/
    ├── AUDIT_FILES_MANIFEST.md
    ├── AUDIT_SUMMARY_QUICK_REFERENCE.md
    ├── MENU_SYSTEM_FINAL_SUMMARY.txt
    ├── PHASE_1-5_COMPLETION_REPORTS.md
    ├── UI_AUDIT_*.md (20+ files)
    └── 30+ additional documentation files
```

**Archive Recommendation:** ⭐ HIGH PRIORITY - These are historical cleanup files no longer needed

---

## 2. reports/ Directory

**Path:** `reports/`  
**Reason:** Historical report files (50+ reports)  
**Contents:** All markdown reports documenting past project phases and completions

**Sample Files:**
```
reports/
├── AI_ENHANCEMENT_*.md (8 files)
├── LAUNCHER_*.md (10 files)
├── PHASE_*-COMPLETION.md (5 files)
├── PROJECT_*.md (5 files)
├── RAPPORT_*.md (French reports)
├── RESUME_*.md (French resumes)
└── 20+ additional report files
```

**Archive Recommendation:** ⭐ MEDIUM PRIORITY - Historical reports, keep for reference but not needed in active codebase

---

## 3. plans/storycore-engine-saas-* Files

**Path:** `plans/storycore-engine-saas-*.md`  
**Reason:** Outdated SaaS planning documents  
**Contents:** 6 SaaS planning markdown files

**Files:**
1. `plans/storycore-engine-saas-action-plan.md`
2. `plans/storycore-engine-saas-architecture.md`
3. `plans/storycore-engine-saas-detailed-architecture.md`
4. `plans/storycore-engine-saas-final-summary.md`
5. `plans/storycore-engine-saas-payment-workflow.md`
6. `plans/storycore-engine-saas-strategy.md`

**Archive Recommendation:** ⭐ HIGH PRIORITY - SaaS planning no longer relevant to current architecture

---

## Git History Retrieval Instructions

If any files need to be retrieved after archival:

```bash
# List all archived files
git ls-tree -r HEAD --name-only | grep -E '^(archive|reports)/'

# Restore a specific file
git checkout HEAD -- archive/root_cleanup_2026_02/AUDIT_FILES_MANIFEST.md

# Search for deleted files in history
git log --all --full-history -- "archive/"

# View file at specific commit
git show <commit-hash>:archive/root_cleanup_2026_02/AUDIT_FILES_MANIFEST.md

# Find commit that deleted files
git log --all --oneline --diff-filter=D -- "archive/" | head -5
```

---

## Deletion Commands

When ready to remove these directories from the active codebase:

```powershell
# Option 1: Delete directly (irreversible)
Remove-Item -Recurse -Force archive/
Remove-Item -Recurse -Force reports/
Remove-Item -Force plans/storycore-engine-saas-action-plan.md
Remove-Item -Force plans/storycore-engine-saas-architecture.md
Remove-Item -Force plans/storycore-engine-saas-detailed-architecture.md
Remove-Item -Force plans/storycore-engine-saas-final-summary.md
Remove-Item -Force plans/storycore-engine-saas-payment-workflow.md
Remove-Item -Force plans/storycore-engine-saas-strategy.md

# Option 2: Use the archiving script
.\scripts\archive_cleanup_dirs.ps1
```

---

## Summary

| Directory/Pattern | Priority | Estimated Files | Action |
|-------------------|----------|-----------------|--------|
| `archive/` | High | ~80 files | Archive & Delete |
| `reports/` | Medium | ~50 files | Archive & Delete |
| `plans/saas-*.md` | High | 6 files | Archive & Delete |

**Total Files to Archive:** ~136 files  
**Space Saved:** ~1-2 MB

---

*Generated as part of the optimization audit deferred tasks*
