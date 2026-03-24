# Platform Upgrade Roadmap (Easy -> Hard)

## Phase 1 - Easy (Implemented)

- Add guided "Next Steps" section on home page for authenticated users
- Add progress snapshot (chapters, labs, exams)
- Add quick CTA based on current learner state
- Add visible roadmap cards (easy / medium / hard)

Status: done

## Phase 2 - Medium

- Add personalized recommendations based on weak chapter/exam outcomes
- Add richer activity feed with actionable links
- Add global smart search across chapters, commands, labs, exams
- Add clearer empty states with direct CTAs in all major pages

Status: done

Implemented in this phase:

- Personalized recommendations and recent exam activity on home page
- Global smart search page with federated results
- Enhanced empty states with actionable CTAs

## Phase 3 - Hard

- Implement realistic exam mode: strict timer, attempt history, deep review
- Add analytics dashboard with weak-topic detection and score trend charts
- Add robust chat history persistence and retry UX for AI responses
- Expand automated tests (critical user flows + API integration paths)

Implemented from hard phase:

- Exam auto-submit when timer reaches zero
- Latest attempt shown before exam start
- Floating AI chat history persistence via localStorage

Status: in progress

## Execution Notes

- Prioritize user impact and retention for every phase
- Keep all UI changes consistent with OCTOPUS design tokens
- Validate with `npm run build` after each batch
