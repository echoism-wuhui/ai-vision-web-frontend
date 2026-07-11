# Database Freeze (Phase 1)

Current fixed tables:

- `users`
- `images`
- `analysis_results`
- `ai_configs`

No extra tables in Phase 1 unless severe bug or teacher-required change.

## users

- `id` INTEGER PK
- `username` VARCHAR(64) UNIQUE NOT NULL
- `password_hash` VARCHAR(256) NOT NULL
- `created_at` DATETIME

## images

- `id` INTEGER PK
- `user_id` INTEGER FK -> users.id NOT NULL
- `filename` VARCHAR(256) NOT NULL
- `file_path` VARCHAR(512) NOT NULL
- `file_size` INTEGER
- `created_at` DATETIME

## analysis_results

- `id` INTEGER PK
- `user_id` INTEGER FK -> users.id NOT NULL
- `image_id` INTEGER FK -> images.id NOT NULL
- `provider` VARCHAR(32)
- `model_name` VARCHAR(128)
- `analysis_type` VARCHAR(64)
- `result_json` TEXT
- `latency` FLOAT
- `created_at` DATETIME

Removed in Phase 1 design:

- `status`
- `request_time`
- `response_time`
- `elapsed_ms`

## ai_configs

- `id` INTEGER PK
- `user_id` INTEGER FK -> users.id NOT NULL
- `config_name` VARCHAR(128)
- `provider` VARCHAR(32)
- `base_url` VARCHAR(512)
- `api_key_encrypted` VARCHAR(512)
- `model_name` VARCHAR(128)
- `is_default` INTEGER
- `created_at` DATETIME

## Relationship Summary

- One user -> many images
- One user -> many analysis_results
- One user -> many ai_configs
- One image -> many analysis_results
