#!/usr/bin/env bash
# One-time setup so GitHub Actions can deploy to Azure without stored secrets.
# Creates an Entra app + service principal, federated credentials for the dev
# branch and the prod environment, assigns roles on both resource groups, and
# writes the three GitHub repo variables the workflows read.
#
# Requires: az (logged in to the 'manali' subscription) and gh (logged in).
# Idempotent: re-running updates rather than duplicates.
set -euo pipefail

SUB="${AZURE_SUBSCRIPTION_ID:-a3e539ea-7688-46db-b78d-e73b4476439d}"
REPO="manali-co/what-should-we-watch"
APP_NAME="wsww-github-oidc"
TENANT="$(az account show --query tenantId -o tsv)"

az account set -s "$SUB"

APP_ID="$(az ad app list --display-name "$APP_NAME" --query '[0].appId' -o tsv)"
if [ -z "$APP_ID" ]; then
  APP_ID="$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)"
fi
az ad sp show --id "$APP_ID" >/dev/null 2>&1 || az ad sp create --id "$APP_ID" >/dev/null
SP_ID="$(az ad sp show --id "$APP_ID" --query id -o tsv)"

add_fic () {
  local name="$1" subject="$2"
  az ad app federated-credential create --id "$APP_ID" --parameters "{
    \"name\": \"$name\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"$subject\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }" 2>/dev/null || echo "  (federated credential $name already exists)"
}
add_fic "wsww-dev-branch" "repo:${REPO}:ref:refs/heads/dev"
add_fic "wsww-prod-env"   "repo:${REPO}:environment:prod"

for RG in rg-wsww-dev rg-wsww-prod; do
  az group create -n "$RG" -l eastus2 >/dev/null
  SCOPE="/subscriptions/${SUB}/resourceGroups/${RG}"
  az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal \
    --role "Contributor" --scope "$SCOPE" 2>/dev/null || true
  # Needed so the pipeline can grant the Function App identity data-plane roles.
  az role assignment create --assignee-object-id "$SP_ID" --assignee-principal-type ServicePrincipal \
    --role "User Access Administrator" --scope "$SCOPE" 2>/dev/null || true
done

gh variable set AZURE_CLIENT_ID --repo "$REPO" --body "$APP_ID"
gh variable set AZURE_TENANT_ID --repo "$REPO" --body "$TENANT"
gh variable set AZURE_SUBSCRIPTION_ID --repo "$REPO" --body "$SUB"

echo "OIDC bootstrap complete. App: $APP_ID"
