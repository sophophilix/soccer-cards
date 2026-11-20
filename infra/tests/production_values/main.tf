# Test helper with no resources: decodes production.tfvars. Only the tests
# need the built-in provider. Cloudflare is declared so the test's mock
# resolves to the same provider.

terraform {
  required_providers {
    terraform = {
      source = "terraform.io/builtin/terraform"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.28.1"
    }
  }
}

output "values" {
  description = "The values in production.tfvars, decoded."
  value       = provider::terraform::decode_tfvars(file("${path.module}/../../production.tfvars"))
}
