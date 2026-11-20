# ADR 0002 D8. Cloudflare creates the DNS record and certificate for the
# custom domain. No zone-wide setting or other DNS record is managed here.
resource "cloudflare_workers_custom_domain" "site" {
  account_id = var.account_id
  zone_name  = var.zone_name
  hostname   = var.hostname
  service    = var.worker_name

  # Losing this name takes the site down. The tech lead reviews any removal.
  lifecycle {
    prevent_destroy = true
  }
}
