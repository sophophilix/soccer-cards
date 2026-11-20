# The provider reads its token from CLOUDFLARE_API_TOKEN, which CI sets from
# the GitHub environment (ADR 0002 D6). No credential goes here.
provider "cloudflare" {}
