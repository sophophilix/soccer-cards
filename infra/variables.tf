# No defaults: the real values are in production.tfvars.
variable "account_id" {
  type        = string
  nullable    = false
  description = "The Cloudflare account ID that owns the Worker."

  validation {
    condition     = can(regex("^[0-9a-f]{32}$", var.account_id))
    error_message = "account_id must be exactly 32 lowercase hexadecimal characters."
  }
}

variable "zone_name" {
  type        = string
  nullable    = false
  description = "The Cloudflare zone that holds the site's hostname."

  validation {
    condition     = can(regex("^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$", var.zone_name))
    error_message = "zone_name must be a lowercase domain name with at least two labels, such as dsantmaj.com."
  }
}

variable "hostname" {
  type        = string
  nullable    = false
  description = "The address the site answers at, inside zone_name."

  validation {
    condition     = can(regex("^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$", var.hostname))
    error_message = "hostname must be a lowercase domain name, such as soccercards.dsantmaj.com."
  }

  validation {
    condition     = endswith(var.hostname, ".${var.zone_name}")
    error_message = "hostname must end in .<zone_name>, so it is a name inside the zone."
  }
}

variable "worker_name" {
  type        = string
  nullable    = false
  description = "The Worker that serves the site. Wrangler creates and deploys it."

  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$", var.worker_name))
    error_message = "worker_name must be 1 to 63 lowercase letters, digits and hyphens, and must not start or end with a hyphen."
  }
}

variable "state_passphrase" {
  type        = string
  nullable    = false
  sensitive   = true
  description = "The passphrase that encrypts state and plans. CI sets it from the TF_STATE_PASSPHRASE secret."

  validation {
    condition     = length(var.state_passphrase) >= 32
    error_message = "state_passphrase must be at least 32 characters long."
  }
}
