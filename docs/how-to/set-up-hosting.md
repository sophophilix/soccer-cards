# Set up hosting (tech lead, once)

> Created: 2026-11-20
> Decision: ADR 0002, D8 to D10

These steps give CI what it needs to preview, deploy and apply. Only the tech
lead runs them. No agent holds these credentials, and no value below goes in
the repository or in a chat.

Do them in order. Steps 1 to 3 can happen before any hosting task merges.
Step 4 waits for the first deploy.

## 1. Cloudflare tokens

In the Cloudflare dashboard, open **My Profile → API Tokens → Create Token →
Custom token**. Create four tokens. Limit each to your account, and the zone
permissions to `dsantmaj.com` only.

| Token name | Permissions | Goes in environment | Secret name |
|---|---|---|---|
| `soccercards-preview-upload` | Account: Workers Scripts, Edit | `preview` | `CLOUDFLARE_API_TOKEN` |
| `soccercards-preview-plan` | Account: Workers Scripts, Read. Zone: Zone, Read. Zone: Workers Routes, Read. Zone: DNS, Read | `preview` | `CLOUDFLARE_INFRA_TOKEN` |
| `soccercards-deploy` | Account: Workers Scripts, Edit | `production` | `CLOUDFLARE_API_TOKEN` |
| `soccercards-infra` | Account: Workers Scripts, Edit. Zone: Zone, Read. Zone: Workers Routes, Edit. Zone: DNS, Edit | `production` | `CLOUDFLARE_INFRA_TOKEN` |

Set an expiry date on each token, and put a reminder in your calendar a week
before it.

Zone: Zone, Read lets OpenTofu look up the zone ID of `dsantmaj.com` from its
name. Leave **Client IP Address Filtering** empty, because GitHub's runners
change address.

Before step 4, check that **DNS → Records** for `dsantmaj.com` has no record
named `soccercards`. Cloudflare can't attach the custom domain over one.

## 2. Azure storage for OpenTofu state

This project uses your **personal** Azure account, never the work one. The
Azure CLI keeps each sign-in in the folder `AZURE_CONFIG_DIR` names, so a
separate folder keeps the two accounts apart.

Once, sign in to the personal account in its own folder:

```sh
mkdir -p ~/.azure-personal
AZURE_CONFIG_DIR=~/.azure-personal az login --tenant <personal-tenant-id-or-domain>
```

In every terminal you use for this guide, run these two lines first, and
read the output before going on. It must name your personal subscription and
email:

```sh
export AZURE_CONFIG_DIR=~/.azure-personal
az account show --query "{subscription:name, user:user.name, tenant:tenantId}" -o table
```

If it names the work account, stop. Close the terminal and start again.

The names below are suggestions.
A storage account name must be unique across Azure, 3 to 24 lowercase letters
and digits.

```sh
LOCATION=australiaeast
RG=rg-soccercards-tfstate
SA=stsoccercardstate
REPO=sophophilix/soccer-cards

az group create --name "$RG" --location "$LOCATION"

az storage account create --name "$SA" --resource-group "$RG" \
  --location "$LOCATION" --sku Standard_LRS --kind StorageV2 \
  --min-tls-version TLS1_2 --allow-blob-public-access false \
  --allow-shared-key-access false

az storage account blob-service-properties update \
  --account-name "$SA" --resource-group "$RG" \
  --enable-versioning true \
  --enable-delete-retention true --delete-retention-days 30

SA_ID=$(az storage account show --name "$SA" --resource-group "$RG" --query id -o tsv)
ME=$(az ad signed-in-user show --query id -o tsv)
az role assignment create --assignee "$ME" \
  --role "Storage Blob Data Contributor" --scope "$SA_ID"

az storage container create --name tfstate --account-name "$SA" --auth-mode login
```

The role assignment can take a few minutes to apply. If the last command
says you lack permission, wait and run it again.

## 3. Two sign-ins for GitHub Actions

Each GitHub environment gets its own Azure identity (ADR 0002 D9). Any branch
can use `preview`, so its identity can only read the state. Only
`production` can write it.

| Identity | Federated for | Role on the storage account |
|---|---|---|
| `soccercards-github-plan` | `environment:preview` | Storage Blob Data Reader |
| `soccercards-github-infra` | `environment:production` | Storage Blob Data Contributor |

```sh
make_identity() { # <app name> <environment> <role>
  local app_id
  app_id=$(az ad app create --display-name "$1" --query appId -o tsv)
  az ad sp create --id "$app_id"
  az ad app federated-credential create --id "$app_id" --parameters "{
    \"name\": \"github-$2\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:$REPO:environment:$2\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"
  az role assignment create --assignee "$app_id" --role "$3" --scope "$SA_ID"
  echo "$2: AZURE_CLIENT_ID=$app_id"
}

make_identity soccercards-github-plan preview "Storage Blob Data Reader"
make_identity soccercards-github-infra production "Storage Blob Data Contributor"
echo "AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID=$(az account show --query id -o tsv)"
```

Each identity reaches this one storage account and nothing else. The
`production` identity must have no federated credential for `preview`.

## 4. GitHub environments

In the repository, open **Settings → Environments**.

1. Create `preview`. Add no reviewer. Under **Deployment branches and tags**,
   allow all branches.
2. Create `production`. Add yourself as a **required reviewer**. Under
   **Deployment branches and tags**, allow `main` only.
3. In each environment, add the two Cloudflare secrets from step 1, and one
   more secret, `TF_STATE_PASSPHRASE`. Use the same passphrase in both, at
   least 32 random characters, for example from `openssl rand -base64 32`.
   Keep a copy in your password manager. Without it the state can't be read.
4. In each environment, add these **variables** (not secrets):

| Variable | Value |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | `6e55015905bde9a976153c3a3a677061` |
| `AZURE_CLIENT_ID` | From step 3. A different identity in each environment |
| `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | From the end of step 3 |
| `TF_STATE_RESOURCE_GROUP` | `rg-soccercards-tfstate` |
| `TF_STATE_STORAGE_ACCOUNT` | `stsoccercardstate` |

## 5. The first deploy, then the address

1. Merge the deploy workflow's pull request. Approve the `production`
   deployment when GitHub asks. This creates the Worker `soccer-cards`.
2. Merge the infra pull request. Approve the `production` run of
   `tofu apply`. This attaches `soccercards.dsantmaj.com`.
3. Open `https://soccercards.dsantmaj.com`. The certificate can take a few
   minutes.

## Rolling back

In the Cloudflare dashboard, open **Workers & Pages → soccer-cards →
Deployments**, pick the previous version and choose **Deploy**. No laptop
holds a deploy token (ADR 0002 D6), so the dashboard is the way. Agents
can't roll back.
