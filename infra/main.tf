# The one resource OpenTofu manages (ADR 0002 D8). Cloudflare creates the
# DNS record and the certificate for the custom domain. No zone-wide
# setting and no other DNS record is managed here.
resource "cloudflare_workers_custom_domain" "site" {
  account_id = var.account_id
  zone_name  = var.zone_name
  hostname   = var.hostname
  service    = var.worker_name
}
