# ADR 0002. Plans and applies run only in CI.
terraform {
  required_version = "1.13.9"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.28.1"
    }
  }

  # ADR 0002 D9. The storage names come from -backend-config at init, and
  # the OpenID Connect sign-in from the ARM_* variables CI sets.
  backend "azurerm" {
    key              = "soccer-cards.tfstate"
    use_oidc         = true
    use_azuread_auth = true
  }

  # The passphrase comes from TF_VAR_state_passphrase, which must be set
  # before init. No fallback, so an unencrypted state or plan is refused.
  encryption {
    key_provider "pbkdf2" "state_passphrase" {
      passphrase = var.state_passphrase
    }

    method "aes_gcm" "state" {
      keys = key_provider.pbkdf2.state_passphrase
    }

    state {
      method   = method.aes_gcm.state
      enforced = true
    }

    plan {
      method   = method.aes_gcm.state
      enforced = true
    }
  }
}
