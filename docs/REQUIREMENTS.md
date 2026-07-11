# Requirements Freeze (Phase 1)

This document is frozen for Phase 1.
Do not change scope unless there is a severe bug or teacher-required change.

## Project Goal

Build a web system for image recognition and semantic analysis with a complete
3-layer architecture:

- Vue 3 frontend
- FastAPI backend
- SQLite database

Core user flow:

1. User registers and logs in.
2. User uploads an image.
3. User starts AI analysis.
4. Backend calls AI provider synchronously.
5. Result is saved and shown to user.
6. User manages analysis history and AI configs.

## V1 (Must Complete)

- Authentication: register, login, current user
- Image upload/list/delete
- Analysis create/list/get/update/delete
- AI config create/list/get/update/delete
- Database persistence for users/images/analysis_results/ai_configs
- Responsive pages:
  - AuthPage
  - WorkbenchPage
  - HistoryPage
  - AIConfigPage

## V2 (Recommended)

- Better UX polish: loading states, empty states, better validation messages
- Analysis result cards with clearer grouped display
- Search/filter/sort for history list
- Better mobile layout refinements

## V3 (Optional, If Time Allows)

- Local AI provider real integration (currently only reserved)
- Export analysis report
- Batch analysis workflow
