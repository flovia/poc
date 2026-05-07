import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("lightsail shared stack", () => {
  test("compose uses caddy with persisted tls state", () => {
    const compose = read("../../docker-compose.lightsail.yml");

    expect(compose).toContain("  caddy:\n");
    expect(compose).toContain("    image: caddy:2-alpine");
    expect(compose).toContain('      - "${CADDY_HTTP_PORT:-80}:80"');
    expect(compose).toContain('      - "${CADDY_HTTPS_PORT:-443}:443"');
    expect(compose).toContain("      - ./deploy/caddy:/etc/caddy:ro");
    expect(compose).toContain("      - caddy_data:/data");
    expect(compose).toContain("      - caddy_config:/config");
    expect(compose).toContain("volumes:\n  caddy_data:\n  caddy_config:\n");
    expect(compose).not.toContain("  nginx:\n");
  });

  test("caddyfile routes both branches with stripped prefixes", () => {
    const caddyfile = read("../../deploy/caddy/Caddyfile");

    expect(caddyfile).toContain("(api_routes) {");
    expect(caddyfile).toContain("handle / {");
    expect(caddyfile).toContain('respond "{\\"branches\\":[\\"main\\",\\"develop\\"]}" 200');
    expect(caddyfile).toContain("redir /main /main/ 308");
    expect(caddyfile).toContain("handle_path /main/* {");
    expect(caddyfile).toContain("reverse_proxy main-bff:3001 {");
    expect(caddyfile).toContain("header_up X-Forwarded-Prefix /main");
    expect(caddyfile).toContain("redir /develop /develop/ 308");
    expect(caddyfile).toContain("handle_path /develop/* {");
    expect(caddyfile).toContain("reverse_proxy develop-bff:3001 {");
    expect(caddyfile).toContain("header_up X-Forwarded-Prefix /develop");
    expect(caddyfile).toContain('respond "not found" 404');
    expect(caddyfile).toContain("api.flovia402.com {");
    expect(caddyfile).toContain("import api_routes");
  });

  test("deployment sync provisions caddy stack assets and prunes unused images", () => {
    const syncScript = read("./lightsail-sync-stack.sh");

    expect(syncScript).toContain('stack_caddy_dir="${stack_root}/deploy/caddy"');
    expect(syncScript).toContain('stack_caddy_config="${stack_caddy_dir}/Caddyfile"');
    expect(syncScript).toContain('install -m 644 deploy/caddy/Caddyfile "$stack_caddy_config"');
    expect(syncScript).toContain('upsert_env_var "$stack_env_file" CADDY_HTTP_PORT "80"');
    expect(syncScript).toContain('upsert_env_var "$stack_env_file" CADDY_HTTPS_PORT "443"');
    expect(syncScript).toContain(
      'docker compose --env-file "$stack_env_file" -f "$stack_compose_file" pull "$service_name" caddy',
    );
    expect(syncScript).toContain(
      'docker compose --env-file "$stack_env_file" -f "$stack_compose_file" up -d --remove-orphans "$service_name" caddy',
    );
    expect(syncScript).toContain(
      'docker compose --env-file "$stack_env_file" -f "$stack_compose_file" exec -T -w /etc/caddy caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile',
    );
    expect(syncScript).toContain("docker image prune -a -f");
    expect(syncScript).not.toContain("remove_old_bff_images");
    expect(syncScript).not.toContain("nginx");
  });

  test("deployment passes live analytics database url to stack sync", () => {
    const workflow = read("../../.github/workflows/deploy-lightsail-shared.yml");

    expect(workflow).toContain("# - MAIN_BFF_ANALYTICS_DATABASE_URL");
    expect(workflow).toContain("# - DEVELOP_BFF_ANALYTICS_DATABASE_URL");
    expect(workflow).toContain("# - BFF_ANALYTICS_DATABASE_URL");
    expect(workflow).toContain("encode_env() {");
    expect(workflow).toContain("decode_env() {");
    expect(workflow).toContain(
      "MAIN_BFF_ANALYTICS_DATABASE_URL: ${{ secrets.MAIN_BFF_ANALYTICS_DATABASE_URL }}",
    );
    expect(workflow).toContain(
      "DEVELOP_BFF_ANALYTICS_DATABASE_URL: ${{ secrets.DEVELOP_BFF_ANALYTICS_DATABASE_URL }}",
    );
    expect(workflow).toContain(
      "BFF_ANALYTICS_DATABASE_URL: ${{ secrets.BFF_ANALYTICS_DATABASE_URL }}",
    );
    expect(workflow).toContain(
      'MAIN_BFF_ANALYTICS_DATABASE_URL_B64="${main_bff_analytics_database_url_b64}"',
    );
    expect(workflow).toContain(
      "decode_env MAIN_BFF_ANALYTICS_DATABASE_URL_B64 MAIN_BFF_ANALYTICS_DATABASE_URL",
    );
  });

  test("deployment sync upserts or deletes live analytics env", () => {
    const syncScript = read("./lightsail-sync-stack.sh");

    expect(syncScript).toContain('analytics_prefix="MAIN"');
    expect(syncScript).toContain('analytics_prefix="DEVELOP"');
    expect(syncScript).toContain(
      'analytics_database_url_key="${analytics_prefix}_BFF_ANALYTICS_DATABASE_URL"',
    );
    expect(syncScript).toContain(
      'analytics_database_url="${!analytics_database_url_key:-${BFF_ANALYTICS_DATABASE_URL:-}}"',
    );
    expect(syncScript).toContain('if [ -n "$analytics_database_url" ]; then');
    expect(syncScript).toContain(
      'upsert_env_var "$stack_env_file" "$analytics_source_key" "postgres"',
    );
    expect(syncScript).toContain(
      'upsert_env_var "$stack_env_file" "$analytics_database_url_key" "$analytics_database_url"',
    );
    expect(syncScript).toContain(
      'upsert_env_var "$stack_env_file" "$analytics_postgres_mode_key" "live"',
    );
    expect(syncScript).toContain('delete_env_var "$stack_env_file" "$analytics_source_key"');
    expect(syncScript).toContain('delete_env_var "$stack_env_file" "$analytics_database_url_key"');
    expect(syncScript).toContain('delete_env_var "$stack_env_file" "$analytics_postgres_mode_key"');
  });

  test("compose passes live analytics postgres mode to both branches", () => {
    const compose = read("../../docker-compose.lightsail.yml");

    expect(compose).toContain(
      "BFF_ANALYTICS_POSTGRES_MODE: ${MAIN_BFF_ANALYTICS_POSTGRES_MODE:-${BFF_ANALYTICS_POSTGRES_MODE:-live}}",
    );
    expect(compose).toContain(
      "BFF_ANALYTICS_POSTGRES_MODE: ${DEVELOP_BFF_ANALYTICS_POSTGRES_MODE:-${BFF_ANALYTICS_POSTGRES_MODE:-live}}",
    );
  });

  test("compose lets both branches share the common MPPX payer key", () => {
    const compose = read("../../docker-compose.lightsail.yml");

    expect(compose).toContain("MPPX_PRIVATE_KEY: ${MAIN_MPPX_PRIVATE_KEY:-${MPPX_PRIVATE_KEY:-}}");
    expect(compose).toContain(
      "MPPX_PRIVATE_KEY: ${DEVELOP_MPPX_PRIVATE_KEY:-${MPPX_PRIVATE_KEY:-}}",
    );
  });

  test("deployment passes common MPPX payer key to stack sync", () => {
    const workflow = read("../../.github/workflows/deploy-lightsail-shared.yml");
    const syncScript = read("./lightsail-sync-stack.sh");

    expect(workflow).toContain("MPPX_PRIVATE_KEY: ${{ secrets.MPPX_PRIVATE_KEY }}");
    expect(workflow).toContain('mppx_private_key_b64="$(encode_env MPPX_PRIVATE_KEY)"');
    expect(workflow).toContain('MPPX_PRIVATE_KEY_B64="${mppx_private_key_b64}"');
    expect(workflow).toContain("decode_env MPPX_PRIVATE_KEY_B64 MPPX_PRIVATE_KEY");
    expect(syncScript).toContain(
      'sync_optional_env_var "$stack_env_file" MPPX_PRIVATE_KEY "${MPPX_PRIVATE_KEY:-}"',
    );
  });
});
