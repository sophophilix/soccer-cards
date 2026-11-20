variable "account_id" {
  type        = string
  description = "The Cloudflare account ID that owns the Worker. CI passes the CLOUDFLARE_ACCOUNT_ID variable."

  validation {
    condition     = can(regex("^[0-9a-f]{32}$", var.account_id))
    error_message = "account_id must be exactly 32 lowercase hexadecimal characters."
  }
}

variable "zone_name" {
  type        = string
  description = "The Cloudflare zone that holds the site's hostname."
  default     = "dsantmaj.com"

  validation {
    condition     = can(regex("^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$", var.zone_name))
    error_message = "zone_name must be a lowercase domain name, such as dsantmaj.com."
  }
}

variable "hostname" {
  type        = string
  description = "The address the site answers at. It must be inside zone_name."
  default     = "soccercards.dsantmaj.com"

  validation {
    condition     = endswith(var.hostname, ".${var.zone_name}") && can(regex("^[a-z0-9.-]+$", var.hostname))
    error_message = "hostname must be a lowercase name that ends in .<zone_name>, such as soccercards.dsantmaj.com."
  }
}

variable "worker_name" {
  type        = string
  description = "The Worker that serves the site. Wrangler creates and deploys it."
  default     = "soccer-cards"

  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$", var.worker_name))
    error_message = "worker_name must be 1 to 63 lowercase letters, digits and hyphens, and must not start or end with a hyphen."
  }
}

variable "state_passphrase" {
  type        = string
  description = "The passphrase that encrypts state and plans. CI passes the TF_STATE_PASSPHRASE secret as TF_VAR_state_passphrase."
  sensitive   = true

  validation {
    condition     = length(var.state_passphrase) >= 32
    error_message = "state_passphrase must be at least 32 characters long."
  }
}
