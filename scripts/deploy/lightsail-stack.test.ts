import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("lightsail shared stack", () => {
  test("compose uses caddy with persisted tls state", () => {
    const compose = read("../../docker-compose.lightsail.yml");

    expect(compose).toContain("  caddy:\n");
    expect(compose).toContain("    image: caddy:2-alpine");
    expect(compose).toContain('      - "80:80"');
    expect(compose).toContain('      - "443:443"');
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
    expect(caddyfile).toContain("reverse_proxy develop-bff-blue:3001 {");
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
    expect(syncScript).toContain('dc pull "$service_name" caddy');
    expect(syncScript).toContain('dc up -d --remove-orphans "$service_name" caddy');
    expect(syncScript).toContain(
      "dc exec -T -w /etc/caddy caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile",
    );
    expect(syncScript).toContain("docker image prune -a -f");
    expect(syncScript).not.toContain("remove_old_bff_images");
    expect(syncScript).not.toContain("nginx");
  });

  test("deployment sync infers active develop slot from running containers", () => {
    const syncScript = read("./lightsail-sync-stack.sh");

    expect(syncScript).not.toContain('slot_state_file="${stack_root}/.develop-bff-slot"');
    expect(syncScript).toContain("get_container_started_at()");
    expect(syncScript).toContain("detect_active_develop_slot()");
    expect(syncScript).toContain('flovia-lightsail-develop-bff-blue-1');
    expect(syncScript).toContain('flovia-lightsail-develop-bff-green-1');
    expect(syncScript).toContain('blue_started_at="$(get_container_started_at');
    expect(syncScript).toContain('green_started_at="$(get_container_started_at');
    expect(syncScript).toContain('detected_active_develop_slot="$(detect_active_develop_slot)"');
    expect(syncScript).toContain('active_slot="$detected_active_develop_slot"');
    expect(syncScript).toContain("next_slot");
    expect(syncScript).toContain('next_slot="blue"');
    expect(syncScript).toContain('next_slot="green"');
    expect(syncScript).toContain('next_service="develop-bff-${next_slot}"');
    expect(syncScript).toContain("wait_for_service_health");
    expect(syncScript).toContain("Rolling back");
    expect(syncScript).toContain("write_caddyfile");
    expect(syncScript).toContain("caddy reload");
    expect(syncScript).toContain('dc stop "$old_service"');
    expect(syncScript).toContain('dc rm -f "$old_service"');
    expect(syncScript).not.toContain('printf \'%s\' "$next_slot" > "$slot_state_file"');
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

  test("deployment sync writes analytics env for each branch", () => {
    const syncScript = read("./lightsail-sync-stack.sh");

    expect(syncScript).toContain(
      'main_analytics_url="${MAIN_BFF_ANALYTICS_DATABASE_URL:-${BFF_ANALYTICS_DATABASE_URL:-}}"',
    );
    expect(syncScript).toContain(
      'develop_analytics_url="${DEVELOP_BFF_ANALYTICS_DATABASE_URL:-${BFF_ANALYTICS_DATABASE_URL:-}}"',
    );
    expect(syncScript).toContain("MAIN_BFF_ANALYTICS_SOURCE=postgres");
    expect(syncScript).toContain('"$main_analytics_url"');
    expect(syncScript).toContain("MAIN_BFF_ANALYTICS_POSTGRES_MODE=live");
    expect(syncScript).toContain("DEVELOP_BFF_ANALYTICS_SOURCE=postgres");
    expect(syncScript).toContain('"$develop_analytics_url"');
    expect(syncScript).toContain("DEVELOP_BFF_ANALYTICS_POSTGRES_MODE=live");
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
});
