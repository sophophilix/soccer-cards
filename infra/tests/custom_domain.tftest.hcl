# Plans the configuration against a mock Cloudflare provider. Nothing here
# reaches Cloudflare or Azure. The values are invented for the test.

mock_provider "cloudflare" {}

variables {
  account_id       = "0123456789abcdef0123456789abcdef"
  state_passphrase = "test-only-passphrase-for-tofu-test"
}

run "attaches_the_hostname_to_the_worker" {
  command = plan

  assert {
    condition     = cloudflare_workers_custom_domain.site.hostname == "soccercards.dsantmaj.com"
    error_message = "The custom domain must be soccercards.dsantmaj.com."
  }

  assert {
    condition     = cloudflare_workers_custom_domain.site.service == "soccer-cards"
    error_message = "The custom domain must point at the Worker soccer-cards."
  }

  assert {
    condition     = cloudflare_workers_custom_domain.site.zone_name == "dsantmaj.com"
    error_message = "The custom domain must be in the zone dsantmaj.com."
  }

  assert {
    condition     = cloudflare_workers_custom_domain.site.account_id == var.account_id
    error_message = "The custom domain must belong to the given account."
  }
}

run "refuses_an_account_id_with_capitals" {
  command = plan

  variables {
    account_id = "0123456789ABCDEF0123456789ABCDEF"
  }

  expect_failures = [var.account_id]
}

run "refuses_an_account_id_of_the_wrong_length" {
  command = plan

  variables {
    account_id = "0123456789abcdef"
  }

  expect_failures = [var.account_id]
}

run "refuses_a_hostname_outside_the_zone" {
  command = plan

  variables {
    hostname = "soccercards.example.com"
  }

  expect_failures = [var.hostname]
}

run "refuses_the_zone_name_as_a_lookalike_suffix" {
  command = plan

  variables {
    hostname = "soccercardsdsantmaj.com"
  }

  expect_failures = [var.hostname]
}

run "refuses_a_bad_zone_name" {
  command = plan

  variables {
    zone_name = "dsantmaj"
    hostname  = "soccercards.dsantmaj"
  }

  expect_failures = [var.zone_name]
}

run "refuses_a_bad_worker_name" {
  command = plan

  variables {
    worker_name = "-soccer-cards"
  }

  expect_failures = [var.worker_name]
}

run "refuses_a_short_state_passphrase" {
  command = plan

  variables {
    state_passphrase = "too-short"
  }

  expect_failures = [var.state_passphrase]
}
