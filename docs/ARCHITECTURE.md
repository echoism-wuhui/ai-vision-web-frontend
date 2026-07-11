# Architecture Freeze (Phase 1)

This architecture is frozen for Phase 1.

## Topology

```text
Vue 3 (Browser)
      |
      v
FastAPI
  |- Database (SQLite)
  |
  `- AI Provider
      |- Cloud
      `- Local (reserved, not implemented in V1)
```

## Responsibilities

- Vue frontend
  - Route pages and user interactions
  - Form validation and state handling
  - API calls and response rendering

- FastAPI backend
  - Auth and permission checks
  - File upload and persistence
  - Analysis orchestration
  - CRUD APIs for history and AI configs

- Database
  - Persistent storage for app core entities

- AI Provider
  - Cloud provider in V1
  - Local provider only reserved in V1

## Data Flow (Synchronous Analysis)

1. User sends `POST /api/analysis` from WorkbenchPage.
2. Backend validates user and image ownership.
3. Backend calls cloud provider synchronously.
4. Backend saves analysis result to `analysis_results`.
5. Backend returns result to frontend.
6. Frontend renders result and history can be queried later.

## Scope Constraints

- No async task queue
- No Redis/RabbitMQ/Celery
- No microservice split
- No additional middleware stack beyond base web app setup
