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
    expect(caddyfile).toContain("reverse_proxy main-bff-blue:3001 {");
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
    expect(syncScript).toContain('dc pull "$next_service" caddy');
    expect(syncScript).toContain('dc up -d "$next_service"');
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
    expect(syncScript).toContain("detect_active_slot()");
    expect(syncScript).toContain("flovia-lightsail-develop-bff-blue-1");
    expect(syncScript).toContain("flovia-lightsail-develop-bff-green-1");
    expect(syncScript).toContain('blue_started_at="$(get_container_started_at');
    expect(syncScript).toContain('green_started_at="$(get_container_started_at');
    expect(syncScript).toContain(
      'detected_active_develop_slot="$(detect_active_slot develop "$develop_blue_container" "$develop_green_container")"',
    );
    expect(syncScript).toContain('active_slot="$detected_active"');
    expect(syncScript).toContain("next_slot");
    expect(syncScript).toContain('next_slot="blue"');
    expect(syncScript).toContain('next_slot="green"');
    expect(syncScript).toContain('next_service="${service_prefix}-${next_slot}"');
    expect(syncScript).toContain("wait_for_service_health_ready");
    expect(syncScript).toContain("local timeout_secs=600");
    expect(syncScript).toContain('health_url="http://${container_ip}:3001/health"');
    expect(syncScript).toContain('curl -sf --max-time "$request_timeout" "$health_url"');
    expect(syncScript).toContain('grep -q \'"status":"ok"\'');
    expect(syncScript).toContain('grep -q \'"service":"flovia-bff"\'');
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
    expect(syncScript).toContain("write_branch_analytics_env()");
    expect(syncScript).toContain("printf '%s_BFF_ANALYTICS_SOURCE=postgres");
    expect(syncScript).toContain("printf '%s_BFF_ANALYTICS_DATABASE_URL=%s");
    expect(syncScript).toContain("printf '%s_BFF_ANALYTICS_POSTGRES_MODE=snapshot");
    expect(syncScript).toContain('write_branch_analytics_env MAIN "$main_analytics_url"');
    expect(syncScript).toContain(
      'print_optional_env_var MAIN_BFF_ANALYTICS_READ_MODEL_PATH "${MAIN_BFF_ANALYTICS_READ_MODEL_PATH:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var MAIN_BFF_ANALYTICS_SNAPSHOT_ID "${MAIN_BFF_ANALYTICS_SNAPSHOT_ID:-}"',
    );
    expect(syncScript).toContain('write_branch_analytics_env DEVELOP "$develop_analytics_url"');
    expect(syncScript).toContain(
      'print_optional_env_var DEVELOP_BFF_ANALYTICS_READ_MODEL_PATH "${DEVELOP_BFF_ANALYTICS_READ_MODEL_PATH:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var DEVELOP_BFF_ANALYTICS_SNAPSHOT_ID "${DEVELOP_BFF_ANALYTICS_SNAPSHOT_ID:-}"',
    );
  });

  test("compose passes snapshot analytics postgres mode to both branches", () => {
    const compose = read("../../docker-compose.lightsail.yml");

    expect(compose).toContain(
      "BFF_ANALYTICS_POSTGRES_MODE: ${MAIN_BFF_ANALYTICS_POSTGRES_MODE:-${BFF_ANALYTICS_POSTGRES_MODE:-snapshot}}",
    );
    expect(compose).toContain(
      "BFF_ANALYTICS_POSTGRES_MODE: ${DEVELOP_BFF_ANALYTICS_POSTGRES_MODE:-${BFF_ANALYTICS_POSTGRES_MODE:-snapshot}}",
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
    expect(syncScript).toContain('print_optional_env_var MPPX_PRIVATE_KEY "${MPPX_PRIVATE_KEY:-}"');
  });

  test("compose lets both branches share the common Stripe secret", () => {
    const compose = read("../../docker-compose.lightsail.yml");

    expect(compose).toContain(
      "STRIPE_SECRET_KEY: ${MAIN_STRIPE_SECRET_KEY:-${STRIPE_SECRET_KEY:-}}",
    );
    expect(compose).toContain(
      "STRIPE_SECRET_KEY: ${DEVELOP_STRIPE_SECRET_KEY:-${STRIPE_SECRET_KEY:-}}",
    );
  });

  test("deployment passes common Stripe secret to stack sync", () => {
    const workflow = read("../../.github/workflows/deploy-lightsail-shared.yml");
    const syncScript = read("./lightsail-sync-stack.sh");

    expect(workflow).toContain("STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}");
    expect(workflow).toContain("MAIN_STRIPE_SECRET_KEY: ${{ secrets.MAIN_STRIPE_SECRET_KEY }}");
    expect(workflow).toContain('stripe_secret_key_b64="$(encode_env STRIPE_SECRET_KEY)"');
    expect(workflow).toContain('main_stripe_secret_key_b64="$(encode_env MAIN_STRIPE_SECRET_KEY)"');
    expect(workflow).toContain('STRIPE_SECRET_KEY_B64="${stripe_secret_key_b64}"');
    expect(workflow).toContain('MAIN_STRIPE_SECRET_KEY_B64="${main_stripe_secret_key_b64}"');
    expect(workflow).toContain("decode_env STRIPE_SECRET_KEY_B64 STRIPE_SECRET_KEY");
    expect(workflow).toContain("decode_env MAIN_STRIPE_SECRET_KEY_B64 MAIN_STRIPE_SECRET_KEY");
    expect(syncScript).toContain(
      'print_optional_env_var STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY:-}"',
    );
  });

  test("deployment sync writes shared and branch-scoped payment secrets", () => {
    const syncScript = read("./lightsail-sync-stack.sh");

    expect(syncScript).toContain('print_optional_env_var HITPAY_API_KEY "${HITPAY_API_KEY:-}"');
    expect(syncScript).toContain(
      'print_optional_env_var HITPAY_WEBHOOK_SALT "${HITPAY_WEBHOOK_SALT:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var HITPAY_MPP_ENDPOINT "${HITPAY_MPP_ENDPOINT:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var MAIN_HITPAY_API_KEY "${MAIN_HITPAY_API_KEY:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var MAIN_HITPAY_WEBHOOK_SALT "${MAIN_HITPAY_WEBHOOK_SALT:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var MAIN_HITPAY_MPP_ENDPOINT "${MAIN_HITPAY_MPP_ENDPOINT:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var DEVELOP_HITPAY_API_KEY "${DEVELOP_HITPAY_API_KEY:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var DEVELOP_HITPAY_WEBHOOK_SALT "${DEVELOP_HITPAY_WEBHOOK_SALT:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var DEVELOP_HITPAY_MPP_ENDPOINT "${DEVELOP_HITPAY_MPP_ENDPOINT:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var MAIN_STRIPE_SECRET_KEY "${MAIN_STRIPE_SECRET_KEY:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var DEVELOP_STRIPE_SECRET_KEY "${DEVELOP_STRIPE_SECRET_KEY:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var DEVELOP_MPPX_PRIVATE_KEY "${DEVELOP_MPPX_PRIVATE_KEY:-}"',
    );
    expect(syncScript).toContain(
      'print_optional_env_var DEVELOP_MPP_SECRET_KEY "${DEVELOP_MPP_SECRET_KEY:-}"',
    );
  });
});
