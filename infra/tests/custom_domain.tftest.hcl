# Checks the resource and every validation condition with invented values.
# The Cloudflare provider is a mock: no credentials, no network.

mock_provider "cloudflare" {}

variables {
  account_id       = "0123456789abcdef0123456789abcdef"
  zone_name        = "example.com"
  hostname         = "game.example.com"
  worker_name      = "test-worker"
  state_passphrase = "test-only-passphrase-for-tofu-test"
}

run "attaches_the_hostname_to_the_worker" {
  command = plan

  assert {
    condition = (
      cloudflare_workers_custom_domain.site.account_id == "0123456789abcdef0123456789abcdef" &&
      cloudflare_workers_custom_domain.site.zone_name == "example.com" &&
      cloudflare_workers_custom_domain.site.hostname == "game.example.com" &&
      cloudflare_workers_custom_domain.site.service == "test-worker"
    )
    error_message = "The custom domain must take its account, zone, hostname and Worker from the variables."
  }
}

run "refuses_an_account_id_with_capitals" {
  command = plan
  variables { account_id = "0123456789ABCDEF0123456789ABCDEF" }
  expect_failures = [var.account_id]
}

run "refuses_an_account_id_that_is_too_short" {
  command = plan
  variables { account_id = "0123456789abcdef0123456789abcde" }
  expect_failures = [var.account_id]
}

run "refuses_an_account_id_that_is_too_long" {
  command = plan
  variables { account_id = "0123456789abcdef0123456789abcdef0" }
  expect_failures = [var.account_id]
}

run "refuses_an_account_id_that_is_not_hexadecimal" {
  command = plan
  variables { account_id = "0123456789abcdef0123456789abcdeg" }
  expect_failures = [var.account_id]
}

run "refuses_a_zone_name_with_one_label" {
  command = plan
  variables { zone_name = "example" }
  expect_failures = [var.zone_name]
}

run "refuses_a_zone_name_with_capitals" {
  command = plan
  variables { zone_name = "Example.com" }
  expect_failures = [var.zone_name]
}

run "refuses_a_zone_name_label_that_starts_with_a_hyphen" {
  command = plan
  variables { zone_name = "-example.com" }
  expect_failures = [var.zone_name]
}

run "refuses_a_hostname_with_capitals" {
  command = plan
  variables { hostname = "Game.example.com" }
  expect_failures = [var.hostname]
}

run "refuses_a_hostname_with_an_underscore" {
  command = plan
  variables { hostname = "the_game.example.com" }
  expect_failures = [var.hostname]
}

run "refuses_a_hostname_outside_the_zone" {
  command = plan
  variables { hostname = "game.example.org" }
  expect_failures = [var.hostname]
}

run "refuses_a_hostname_that_only_ends_in_the_zone_text" {
  command = plan
  variables { hostname = "gameexample.com" }
  expect_failures = [var.hostname]
}

run "refuses_the_zone_apex_as_the_hostname" {
  command = plan
  variables { hostname = "example.com" }
  expect_failures = [var.hostname]
}

run "refuses_a_worker_name_that_starts_with_a_hyphen" {
  command = plan
  variables { worker_name = "-test-worker" }
  expect_failures = [var.worker_name]
}

run "refuses_a_worker_name_that_ends_with_a_hyphen" {
  command = plan
  variables { worker_name = "test-worker-" }
  expect_failures = [var.worker_name]
}

run "refuses_a_worker_name_with_capitals" {
  command = plan
  variables { worker_name = "Test-Worker" }
  expect_failures = [var.worker_name]
}

run "refuses_a_worker_name_longer_than_63_characters" {
  command = plan
  variables { worker_name = "a123456789b123456789c123456789d123456789e123456789f123456789g123" }
  expect_failures = [var.worker_name]
}

run "refuses_a_state_passphrase_shorter_than_32_characters" {
  command = plan
  variables { state_passphrase = "test-only-passphrase-31-charact" }
  expect_failures = [var.state_passphrase]
}
