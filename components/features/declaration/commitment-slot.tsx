"use client"
// Single commitment input slot in the morning declaration form

// TODO (Claude Code prompt):
// "Complete components/features/declaration/commitment-slot.tsx
//
//  Props: index: number (1-3), commitment: DraftCommitment, disabled: boolean
//
//  Shows:
//    - Slot number as text-slate-600 text-sm on the left
//    - shadcn Input for commitment title
//    - Three intensity pill buttons below:
//        Soft | Firm | Non-Negotiable
//        Selected pill: from INTENSITY_CONFIG className
//        Unselected: bg-transparent border border-[#1E1E2E] text-slate-500
//    - Tag selector: small pill row for work/learning/health/other
//  
//  Uses useDeclarationActions to update store
//  Disabled prop greys out entire slot and prevents input"

