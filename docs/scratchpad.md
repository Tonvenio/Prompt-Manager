# Scratchpad – Animated Library View

- Primary implementation plan: `docs/implementation-plan/library-view-animated.md`
- Related route: `langfuse-ui/app/library/page.tsx`

## Notes
- Reuse GSAP-powered components in `langfuse-ui/components` and hooks in `langfuse-ui/hooks/useAnimations.ts`.
- Match screenshot UX: left sidebar, middle list with search, right detail panel with header actions (Use button) and a step card.

## Lessons Learned
- [2025-08-27] Prefer adding new routes rather than replacing existing screens to avoid regressions.
