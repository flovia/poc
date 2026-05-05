#!/usr/bin/env bash

set -euo pipefail

require_env() {
  local key="$1"

  if [ -z "${!key:-}" ]; then
    echo "Missing required env: ${key}" >&2
    exit 1
  fi
}

upsert_env_var() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  local temp_file

  temp_file="$(mktemp)"

  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    index($0, key "=") == 1 {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$env_file" > "$temp_file"

  mv "$temp_file" "$env_file"
}

delete_env_var() {
  local env_file="$1"
  local key="$2"
  local temp_file

  temp_file="$(mktemp)"

  awk -v key="$key" '
    index($0, key "=") != 1 { print }
  ' "$env_file" > "$temp_file"

  mv "$temp_file" "$env_file"
}

sync_optional_env_var() {
  local env_file="$1"
  local key="$2"
  local value="${3:-}"

  if [ -n "$value" ]; then
    upsert_env_var "$env_file" "$key" "$value"
    return
  fi

  delete_env_var "$env_file" "$key"
}

require_env DEPLOY_BRANCH
require_env DEPLOY_GIT_SHA
require_env BFF_IMAGE_REPOSITORY
require_env GHCR_USERNAME
require_env GHCR_TOKEN

case "$DEPLOY_BRANCH" in
  main)
    service_name="main-bff"
    image_tag_key="MAIN_BFF_IMAGE_TAG"
    ;;
  develop)
    service_name="develop-bff"
    image_tag_key="DEVELOP_BFF_IMAGE_TAG"
    ;;
  *)
    echo "Unsupported branch: ${DEPLOY_BRANCH}" >&2
    exit 1
    ;;
esac

apps_root="$HOME/apps"
stack_root="${apps_root}/lightsail-stack"
stack_compose_file="${stack_root}/docker-compose.lightsail.yml"
stack_env_file="${stack_root}/.env"
stack_caddy_dir="${stack_root}/deploy/caddy"
stack_caddy_config="${stack_caddy_dir}/Caddyfile"
main_data_dir="${apps_root}/main/data"
develop_data_dir="${apps_root}/develop/data"

mkdir -p \
  "$stack_root" \
  "$stack_caddy_dir" \
  "$main_data_dir/reports" \
  "$develop_data_dir/reports"

install -m 644 docker-compose.lightsail.yml "$stack_compose_file"
install -m 644 deploy/caddy/Caddyfile "$stack_caddy_config"

touch "$stack_env_file"
chmod 600 "$stack_env_file"

upsert_env_var "$stack_env_file" COMPOSE_PROJECT_NAME "flovia-lightsail"
upsert_env_var "$stack_env_file" BFF_IMAGE_REPOSITORY "$BFF_IMAGE_REPOSITORY"
upsert_env_var "$stack_env_file" MAIN_FLOVIA_DATA_DIR "$main_data_dir"
upsert_env_var "$stack_env_file" DEVELOP_FLOVIA_DATA_DIR "$develop_data_dir"
upsert_env_var "$stack_env_file" BFF_DATA_MOUNT_PATH "/data"
upsert_env_var "$stack_env_file" CADDY_HTTP_PORT "80"
upsert_env_var "$stack_env_file" CADDY_HTTPS_PORT "443"
upsert_env_var "$stack_env_file" "$image_tag_key" "$DEPLOY_GIT_SHA"
sync_optional_env_var "$stack_env_file" AWS_BEARER_TOKEN_BEDROCK "${AWS_BEARER_TOKEN_BEDROCK:-}"
bedrock_region="${BFF_BEDROCK_REGION:-${AWS_REGION:-${AWS_DEFAULT_REGION:-}}}"
sync_optional_env_var "$stack_env_file" AWS_REGION "$bedrock_region"
sync_optional_env_var "$stack_env_file" AWS_DEFAULT_REGION "$bedrock_region"
sync_optional_env_var "$stack_env_file" BFF_BEDROCK_MODEL_ID "${BFF_BEDROCK_MODEL_ID:-}"
sync_optional_env_var "$stack_env_file" BFF_BEDROCK_PROMPT_VERSION "${BFF_BEDROCK_PROMPT_VERSION:-}"

printf '%s\n' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
docker compose --env-file "$stack_env_file" -f "$stack_compose_file" config >/dev/null
docker compose --env-file "$stack_env_file" -f "$stack_compose_file" pull "$service_name" caddy
docker compose --env-file "$stack_env_file" -f "$stack_compose_file" up -d --remove-orphans "$service_name" caddy
docker compose --env-file "$stack_env_file" -f "$stack_compose_file" exec -T -w /etc/caddy caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
docker image prune -a -f
docker logout ghcr.io >/dev/null 2>&1 || true
