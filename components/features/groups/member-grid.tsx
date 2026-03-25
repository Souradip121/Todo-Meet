"use client"
// Group member x week contribution matrix
// Alternative to the personal time grid — shows group consistency

// TODO (Claude Code prompt):
// "Complete components/features/groups/member-grid.tsx
//
//  Props: members: GroupMember[], weeks: number (default 12)
//
//  Grid layout: each row = one member, each column = one week
//  Cell size: 20x20px, rounded-sm, gap-[3px]
//  Cell colour: same SCORE_CLASSES but based on member contribution that week
//  Left side: member avatar (circle, 28px) + display name
//  Hover on cell: tooltip with member name + week + contribution days count
//  Header row: week labels (W1, W2... or date range)
//  Framing: section label Our
