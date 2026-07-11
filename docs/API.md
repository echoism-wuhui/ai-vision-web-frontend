# API Freeze (Phase 1)

Backend base URL (local): `http://127.0.0.1:8000`

Protected APIs require:

`Authorization: Bearer <access_token>`

## Auth

### POST /api/auth/register

- Body (JSON):
  - `username` string
  - `password` string
- Response: created user

### POST /api/auth/login

- Body (`application/x-www-form-urlencoded`):
  - `username`
  - `password`
- Response:
  - `access_token`
  - `token_type`

### GET /api/auth/me

- Response: current user

## Images

### POST /api/images

- Body (`multipart/form-data`):
  - `file` (required)
- Response: image record

### GET /api/images

- Response: image list for current user

### GET /api/images/{image_id}

- Response: single image record

### DELETE /api/images/{image_id}

- Response: delete message

## AI Configs

### POST /api/ai-configs

- Body (JSON):
  - `config_name`
  - `provider`
  - `base_url`
  - `api_key`
  - `model_name`
  - `is_default`
- Response: created config (without raw api key)

### GET /api/ai-configs

- Response: config list

### GET /api/ai-configs/{config_id}

- Response: single config

### PUT /api/ai-configs/{config_id}

- Body (JSON, partial update allowed)
- Response: updated config

### DELETE /api/ai-configs/{config_id}

- Response: delete message

## Analysis

### POST /api/analysis

- Body (JSON):
  - `image_id` integer
  - `analysis_type` one of: `all | describe | tags | scene | prompt`
  - `ai_config_id` integer (optional)
- Behavior:
  - synchronous AI call
  - save result to database
  - return saved record

### GET /api/analysis

- Response: analysis history list

### GET /api/analysis/{analysis_id}

- Response: single analysis record

### PUT /api/analysis/{analysis_id}

- Body (JSON):
  - `result_json` (optional)
- Response: updated analysis record

### DELETE /api/analysis/{analysis_id}

- Response: delete message

## Error Conventions

- `400` business error
- `401` unauthorized
- `404` not found
- `422` validation error
- `500` server or provider error

Phase 1 freeze:

- Do not add Health/Task/Status/Log/Statistics/Report APIs
- Do not change endpoint names and payload contracts unless severe bug or teacher-required change
