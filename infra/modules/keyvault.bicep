param location string
param prefix string
@description('Log Analytics workspace resource id for audit logs (empty = skip diagnostics)')
param workspaceId string = ''

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: take('${prefix}-kv', 24)
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

resource signingKey 'Microsoft.KeyVault/vaults/keys@2023-07-01' = {
  parent: kv
  name: 'wsww-api-signing'
  properties: {
    kty: 'EC'
    curveName: 'P-256'
    keyOps: ['sign', 'verify']
  }
}

// Audit every secret/key access to Log Analytics — who touched which secret, when.
resource kvAudit 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (!empty(workspaceId)) {
  scope: kv
  name: 'audit-to-logs'
  properties: {
    workspaceId: workspaceId
    logs: [ { categoryGroup: 'audit', enabled: true } ]
    metrics: [ { category: 'AllMetrics', enabled: true } ]
  }
}

output keyVaultUri string = kv.properties.vaultUri
output keyVaultId string = kv.id
output keyVaultName string = kv.name
