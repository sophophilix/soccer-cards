# OpenTofu settings for the hosting of soccercards.dsantmaj.com (ADR 0002).
# Plans and applies run only in CI. An agent never applies.

terraform {
  required_version = "1.13.9"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.28.1"
    }
  }

  # State lives in Azure Blob Storage (ADR 0002 D9). The resource group,
  # storage account and container come from -backend-config at init, and
  # the sign-in comes from the ARM_* variables CI sets for OpenID Connect.
  backend "azurerm" {
    key              = "soccer-cards.tfstate"
    use_oidc         = true
    use_azuread_auth = true
  }

  # State and plans are encrypted before they leave the runner. The
  # passphrase comes from the TF_STATE_PASSPHRASE secret through
  # TF_VAR_state_passphrase. There is no fallback, so an unencrypted state
  # or plan is refused.
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

# The provider reads CLOUDFLARE_API_TOKEN from the environment.
provider "cloudflare" {}
