# Proves the committed production.tfvars passes every validation rule. The
# Cloudflare provider is a mock: no credentials, no network.

mock_provider "cloudflare" {}

# The helper has no resources, so this apply only evaluates its output.
run "read_production_values" {
  module {
    source = "./tests/production_values"
  }
}

run "production_values_pass_validation" {
  command = plan

  variables {
    account_id       = run.read_production_values.values.account_id
    zone_name        = run.read_production_values.values.zone_name
    hostname         = run.read_production_values.values.hostname
    worker_name      = run.read_production_values.values.worker_name
    state_passphrase = "test-only-passphrase-for-tofu-test"
  }

  assert {
    condition = (
      cloudflare_workers_custom_domain.site.hostname == "soccercards.dsantmaj.com" &&
      cloudflare_workers_custom_domain.site.zone_name == "dsantmaj.com" &&
      cloudflare_workers_custom_domain.site.service == "soccer-cards"
    )
    error_message = "production.tfvars must attach soccercards.dsantmaj.com to soccer-cards."
  }
}
