# Test helper with no resources: decodes production.tfvars for the tests.
terraform {
  required_providers {
    terraform = {
      source = "terraform.io/builtin/terraform"
    }
    # Declared only so the test file's Cloudflare mock resolves here.
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
