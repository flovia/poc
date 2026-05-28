#!/usr/bin/env bash

set -euo pipefail

require_env() {
  local key="$1"

  if [ -z "${!key:-}" ]; then
    echo "Missing required env: ${key}" >&2
    exit 1
  fi
}

print_optional_env_var() {
  local key="$1"
  local value="${2:-}"

  if [ -n "$value" ]; then
    printf '%s=%s\n' "$key" "$value"
  fi
}

write_branch_analytics_env() {
  local prefix="$1"
  local database_url="$2"

  if [ -n "$database_url" ]; then
    printf '%s_BFF_ANALYTICS_SOURCE=postgres\n' "$prefix"
    printf '%s_BFF_ANALYTICS_DATABASE_URL=%s\n' "$prefix" "$database_url"
    printf '%s_BFF_ANALYTICS_POSTGRES_MODE=live\n' "$prefix"
  fi
}

require_env DEPLOY_BRANCH
require_env DEPLOY_GIT_SHA
require_env BFF_IMAGE_REPOSITORY
require_env GHCR_USERNAME
require_env GHCR_TOKEN

case "$DEPLOY_BRANCH" in
  main|develop) ;;
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
main_blue_container="flovia-lightsail-main-bff-blue-1"
main_green_container="flovia-lightsail-main-bff-green-1"
develop_blue_container="flovia-lightsail-develop-bff-blue-1"
develop_green_container="flovia-lightsail-develop-bff-green-1"

mkdir -p \
  "$stack_root" \
  "$stack_caddy_dir" \
  "$main_data_dir/reports" \
  "$develop_data_dir/reports"

install -m 644 docker-compose.lightsail.yml "$stack_compose_file"

# Read the image tag from a currently running container (empty string if not found)
get_running_image_tag() {
  local container="$1"
  local running image

  running="$(docker inspect "$container" --format '{{.State.Running}}' 2>/dev/null)" || true
  if [ "$running" != "true" ]; then
    return 0
  fi

  image="$(docker inspect "$container" --format '{{index .Config.Image}}' 2>/dev/null)" || true
  printf '%s' "${image##*:}"
}

get_container_started_at() {
  local container="$1"

  docker inspect "$container" --format '{{if .State.Running}}{{.State.StartedAt}}{{end}}' 2>/dev/null || true
}

detect_active_slot() {
  local branch="$1"
  local blue_container="$2"
  local green_container="$3"
  local blue_started_at green_started_at

  blue_started_at="$(get_container_started_at "$blue_container")"
  green_started_at="$(get_container_started_at "$green_container")"

  if [ -n "$blue_started_at" ] && [ -z "$green_started_at" ]; then
    printf 'blue'
    return 0
  fi

  if [ -n "$green_started_at" ] && [ -z "$blue_started_at" ]; then
    printf 'green'
    return 0
  fi

  if [ -n "$blue_started_at" ] && [ -n "$green_started_at" ]; then
    echo "Both ${branch} slots are running; selecting the newest container." >&2
    if [[ "$green_started_at" > "$blue_started_at" ]]; then
      printf 'green'
    else
      printf 'blue'
    fi
  fi
}

detected_active_main_slot="$(detect_active_slot main "$main_blue_container" "$main_green_container")"
active_main_slot="${detected_active_main_slot:-blue}"

detected_active_develop_slot="$(detect_active_slot develop "$develop_blue_container" "$develop_green_container")"
active_develop_slot="${detected_active_develop_slot:-blue}"

# Rebuild the shared stack env for both branches:
# - the branch being deployed gets the new SHA
# - the other branch keeps its current running image tag
if [ "$DEPLOY_BRANCH" = "main" ]; then
  main_image_tag="$DEPLOY_GIT_SHA"
  develop_image_tag="$(get_running_image_tag "flovia-lightsail-develop-bff-${active_develop_slot}-1")"
  develop_image_tag="${develop_image_tag:-develop}"
else
  develop_image_tag="$DEPLOY_GIT_SHA"
  main_image_tag="$(get_running_image_tag "flovia-lightsail-main-bff-${active_main_slot}-1")"
  main_image_tag="${main_image_tag:-main}"
fi

main_analytics_url="${MAIN_BFF_ANALYTICS_DATABASE_URL:-${BFF_ANALYTICS_DATABASE_URL:-}}"
develop_analytics_url="${DEVELOP_BFF_ANALYTICS_DATABASE_URL:-${BFF_ANALYTICS_DATABASE_URL:-}}"
bedrock_region="${BFF_BEDROCK_REGION:-${AWS_REGION:-${AWS_DEFAULT_REGION:-}}}"

{
  printf 'BFF_IMAGE_REPOSITORY=%s\n' "$BFF_IMAGE_REPOSITORY"
  printf 'MAIN_BFF_IMAGE_TAG=%s\n' "$main_image_tag"
  printf 'DEVELOP_BFF_IMAGE_TAG=%s\n' "$develop_image_tag"
  printf 'MAIN_FLOVIA_DATA_DIR=%s\n' "$main_data_dir"
  printf 'DEVELOP_FLOVIA_DATA_DIR=%s\n' "$develop_data_dir"

  if [ -n "$bedrock_region" ]; then
    printf 'AWS_REGION=%s\n' "$bedrock_region"
    printf 'AWS_DEFAULT_REGION=%s\n' "$bedrock_region"
  fi

  print_optional_env_var AWS_BEARER_TOKEN_BEDROCK "${AWS_BEARER_TOKEN_BEDROCK:-}"
  print_optional_env_var BFF_BEDROCK_MODEL_ID "${BFF_BEDROCK_MODEL_ID:-}"
  print_optional_env_var BFF_BEDROCK_PROMPT_VERSION "${BFF_BEDROCK_PROMPT_VERSION:-}"

  print_optional_env_var BFF_ANALYTICS_SOURCE "${BFF_ANALYTICS_SOURCE:-}"
  print_optional_env_var BFF_ANALYTICS_DATABASE_URL "${BFF_ANALYTICS_DATABASE_URL:-}"
  print_optional_env_var BFF_ANALYTICS_POSTGRES_MODE "${BFF_ANALYTICS_POSTGRES_MODE:-}"
  print_optional_env_var BFF_ANALYTICS_READ_MODEL_PATH "${BFF_ANALYTICS_READ_MODEL_PATH:-}"
  print_optional_env_var BFF_ANALYTICS_SNAPSHOT_ID "${BFF_ANALYTICS_SNAPSHOT_ID:-}"

  write_branch_analytics_env MAIN "$main_analytics_url"
  print_optional_env_var MAIN_BFF_ANALYTICS_READ_MODEL_PATH "${MAIN_BFF_ANALYTICS_READ_MODEL_PATH:-}"
  print_optional_env_var MAIN_BFF_ANALYTICS_SNAPSHOT_ID "${MAIN_BFF_ANALYTICS_SNAPSHOT_ID:-}"

  write_branch_analytics_env DEVELOP "$develop_analytics_url"
  print_optional_env_var DEVELOP_BFF_ANALYTICS_READ_MODEL_PATH "${DEVELOP_BFF_ANALYTICS_READ_MODEL_PATH:-}"
  print_optional_env_var DEVELOP_BFF_ANALYTICS_SNAPSHOT_ID "${DEVELOP_BFF_ANALYTICS_SNAPSHOT_ID:-}"

  print_optional_env_var HITPAY_API_KEY "${HITPAY_API_KEY:-}"
  print_optional_env_var HITPAY_WEBHOOK_SALT "${HITPAY_WEBHOOK_SALT:-}"
  print_optional_env_var HITPAY_MPP_ENDPOINT "${HITPAY_MPP_ENDPOINT:-}"
  print_optional_env_var MAIN_HITPAY_API_KEY "${MAIN_HITPAY_API_KEY:-}"
  print_optional_env_var MAIN_HITPAY_WEBHOOK_SALT "${MAIN_HITPAY_WEBHOOK_SALT:-}"
  print_optional_env_var MAIN_HITPAY_MPP_ENDPOINT "${MAIN_HITPAY_MPP_ENDPOINT:-}"
  print_optional_env_var DEVELOP_HITPAY_API_KEY "${DEVELOP_HITPAY_API_KEY:-}"
  print_optional_env_var DEVELOP_HITPAY_WEBHOOK_SALT "${DEVELOP_HITPAY_WEBHOOK_SALT:-}"
  print_optional_env_var DEVELOP_HITPAY_MPP_ENDPOINT "${DEVELOP_HITPAY_MPP_ENDPOINT:-}"

  print_optional_env_var STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY:-}"
  print_optional_env_var MAIN_STRIPE_SECRET_KEY "${MAIN_STRIPE_SECRET_KEY:-}"
  print_optional_env_var DEVELOP_STRIPE_SECRET_KEY "${DEVELOP_STRIPE_SECRET_KEY:-}"

  print_optional_env_var MPPX_PRIVATE_KEY "${MPPX_PRIVATE_KEY:-}"
  print_optional_env_var MAIN_MPPX_PRIVATE_KEY "${MAIN_MPPX_PRIVATE_KEY:-}"
  print_optional_env_var DEVELOP_MPPX_PRIVATE_KEY "${DEVELOP_MPPX_PRIVATE_KEY:-}"

  print_optional_env_var MAIN_MPP_SECRET_KEY "${MAIN_MPP_SECRET_KEY:-}"
  print_optional_env_var DEVELOP_MPP_SECRET_KEY "${DEVELOP_MPP_SECRET_KEY:-}"

  print_optional_env_var SOLANA_MPP_RECIPIENT "${SOLANA_MPP_RECIPIENT:-}"
  print_optional_env_var SOLANA_MPP_NETWORK "${SOLANA_MPP_NETWORK:-}"
  print_optional_env_var SOLANA_MPP_CURRENCY "${SOLANA_MPP_CURRENCY:-}"
  print_optional_env_var SOLANA_MPP_SECRET_KEY "${SOLANA_MPP_SECRET_KEY:-}"
  print_optional_env_var SOLANA_MPP_PAYER_PRIVATE_KEY "${SOLANA_MPP_PAYER_PRIVATE_KEY:-}"
  print_optional_env_var SOLANA_MPP_RPC_URL "${SOLANA_MPP_RPC_URL:-}"

  print_optional_env_var MAIN_SOLANA_MPP_RECIPIENT "${MAIN_SOLANA_MPP_RECIPIENT:-}"
  print_optional_env_var MAIN_SOLANA_MPP_NETWORK "${MAIN_SOLANA_MPP_NETWORK:-}"
  print_optional_env_var MAIN_SOLANA_MPP_CURRENCY "${MAIN_SOLANA_MPP_CURRENCY:-}"
  print_optional_env_var MAIN_SOLANA_MPP_SECRET_KEY "${MAIN_SOLANA_MPP_SECRET_KEY:-}"
  print_optional_env_var MAIN_SOLANA_MPP_PAYER_PRIVATE_KEY "${MAIN_SOLANA_MPP_PAYER_PRIVATE_KEY:-}"
  print_optional_env_var MAIN_SOLANA_MPP_RPC_URL "${MAIN_SOLANA_MPP_RPC_URL:-}"

  print_optional_env_var DEVELOP_SOLANA_MPP_RECIPIENT "${DEVELOP_SOLANA_MPP_RECIPIENT:-}"
  print_optional_env_var DEVELOP_SOLANA_MPP_NETWORK "${DEVELOP_SOLANA_MPP_NETWORK:-}"
  print_optional_env_var DEVELOP_SOLANA_MPP_CURRENCY "${DEVELOP_SOLANA_MPP_CURRENCY:-}"
  print_optional_env_var DEVELOP_SOLANA_MPP_SECRET_KEY "${DEVELOP_SOLANA_MPP_SECRET_KEY:-}"
  print_optional_env_var DEVELOP_SOLANA_MPP_PAYER_PRIVATE_KEY "${DEVELOP_SOLANA_MPP_PAYER_PRIVATE_KEY:-}"
  print_optional_env_var DEVELOP_SOLANA_MPP_RPC_URL "${DEVELOP_SOLANA_MPP_RPC_URL:-}"
} > "$stack_env_file"

chmod 600 "$stack_env_file"

dc() {
  docker compose --env-file "$stack_env_file" -f "$stack_compose_file" "$@"
}

write_caddyfile() {
  local main_slot="$1"
  local develop_slot="$2"

  install -m 644 deploy/caddy/Caddyfile "$stack_caddy_config"
  sed -i "s|main-bff-[a-z]*:3001|main-bff-${main_slot}:3001|g" "$stack_caddy_config"
  sed -i "s|develop-bff-[a-z]*:3001|develop-bff-${develop_slot}:3001|g" "$stack_caddy_config"
}

wait_for_service_providers_ready() {
  local service="$1"
  local timeout_secs=600
  local interval=5
  local attempt=0
  local container_id container_ip providers_url response
  local start_time elapsed remaining request_timeout sleep_for

  container_id="$(dc ps -q "$service")"
  if [ -z "$container_id" ]; then
    echo "Container for $service not found" >&2
    return 1
  fi

  container_ip="$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$container_id" \
    | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1)"
  if [ -z "$container_ip" ]; then
    echo "Could not determine IP for $service" >&2
    return 1
  fi

  providers_url="http://${container_ip}:3001/providers"
  start_time="$SECONDS"

  echo "Waiting for $service providers at ${providers_url} ..."
  while true; do
    elapsed=$((SECONDS - start_time))
    remaining=$((timeout_secs - elapsed))
    if [ "$remaining" -le 0 ]; then
      break
    fi

    request_timeout=5
    if [ "$remaining" -lt "$request_timeout" ]; then
      request_timeout="$remaining"
    fi

    if response="$(curl -sf --max-time "$request_timeout" "$providers_url" 2>/dev/null)" \
      && printf '%s' "$response" | grep -q '"providerCount"' \
      && printf '%s' "$response" | grep -q '"providers"'; then
      echo "$service providers endpoint is ready."
      return 0
    fi

    attempt=$((attempt + 1))

    elapsed=$((SECONDS - start_time))
    remaining=$((timeout_secs - elapsed))
    if [ "$remaining" -le 0 ]; then
      break
    fi

    sleep_for="$interval"
    if [ "$remaining" -lt "$sleep_for" ]; then
      sleep_for="$remaining"
    fi

    printf 'Attempt %d failed, retrying in %ds (%ds remaining)...\n' \
      "$attempt" "$sleep_for" "$remaining"
    sleep "$sleep_for"
  done

  echo "Providers readiness check for $service timed out after ${timeout_secs}s" >&2
  return 1
}

printf '%s\n' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
dc config >/dev/null

blue_green_deploy() {
  local branch="$1"
  local detected_active="$2"
  local service_prefix="$3"
  local main_caddy_slot="$4"
  local develop_caddy_slot="$5"

  local active_slot next_slot next_service old_service
  active_slot="$detected_active"
  case "$active_slot" in
    blue)  next_slot="green" ;;
    green) next_slot="blue" ;;
    *)     next_slot="blue"; active_slot="" ;;
  esac

  next_service="${service_prefix}-${next_slot}"
  echo "Blue-Green (${branch}): active=${active_slot:-none} -> next=${next_slot}"

  dc pull "$next_service" caddy
  dc up -d "$next_service"

  if ! wait_for_service_providers_ready "$next_service"; then
    echo "Rolling back: stopping ${next_service}" >&2
    dc stop "$next_service" 2>/dev/null || true
    dc rm -f "$next_service" 2>/dev/null || true
    exit 1
  fi

  if [ "$branch" = "main" ]; then
    write_caddyfile "$next_slot" "$develop_caddy_slot"
  else
    write_caddyfile "$main_caddy_slot" "$next_slot"
  fi
  dc up -d caddy
  dc exec -T -w /etc/caddy caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

  if [ -n "$active_slot" ]; then
    old_service="${service_prefix}-${active_slot}"
    dc stop "$old_service"
    dc rm -f "$old_service"
  fi
}

if [ "$DEPLOY_BRANCH" = "main" ]; then
  blue_green_deploy main "$detected_active_main_slot" main-bff "" "$active_develop_slot"
else
  blue_green_deploy develop "$detected_active_develop_slot" develop-bff "$active_main_slot" ""
fi

docker image prune -a -f
docker logout ghcr.io >/dev/null 2>&1 || true
