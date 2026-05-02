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
    expect(compose).toContain("      - ./deploy/caddy/Caddyfile:/etc/caddy/Caddyfile:ro");
    expect(compose).toContain("      - caddy_data:/data");
    expect(compose).toContain("      - caddy_config:/config");
    expect(compose).toContain("volumes:\n  caddy_data:\n  caddy_config:\n");
    expect(compose).not.toContain("  nginx:\n");
  });

  test("caddyfile routes both branches with stripped prefixes", () => {
    const caddyfile = read("../../deploy/caddy/Caddyfile");

    expect(caddyfile).toContain("{$CADDY_SITE_ADDRESS:localhost}");
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
  });

  test("deployment sync provisions caddy stack assets", () => {
    const syncScript = read("./lightsail-sync-stack.sh");

    expect(syncScript).toContain('stack_caddy_dir="${stack_root}/deploy/caddy"');
    expect(syncScript).toContain('stack_caddy_config="${stack_caddy_dir}/Caddyfile"');
    expect(syncScript).toContain('install -m 644 deploy/caddy/Caddyfile "$stack_caddy_config"');
    expect(syncScript).toContain('upsert_env_var "$stack_env_file" CADDY_HTTP_PORT "80"');
    expect(syncScript).toContain('upsert_env_var "$stack_env_file" CADDY_HTTPS_PORT "443"');
    expect(syncScript).toContain(
      'sync_optional_env_var "$stack_env_file" CADDY_SITE_ADDRESS "${CADDY_SITE_ADDRESS:-}"',
    );
    expect(syncScript).toContain(
      'docker compose --env-file "$stack_env_file" -f "$stack_compose_file" pull "$service_name" caddy',
    );
    expect(syncScript).toContain(
      'docker compose --env-file "$stack_env_file" -f "$stack_compose_file" up -d --remove-orphans "$service_name" caddy',
    );
    expect(syncScript).not.toContain("nginx");
  });

  test("workflow forwards caddy site address to lightsail sync", () => {
    const workflow = read("../../.github/workflows/deploy-lightsail-shared.yml");

    expect(workflow).toContain("# Optional repository secrets for Caddy HTTPS:");
    expect(workflow).toContain("# - LIGHTSAIL_CADDY_SITE_ADDRESS");
    expect(workflow).toContain('CADDY_SITE_ADDRESS="${{ secrets.LIGHTSAIL_CADDY_SITE_ADDRESS }}"');
  });
});
