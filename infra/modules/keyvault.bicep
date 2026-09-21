param location string
param prefix string

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

output keyVaultUri string = kv.properties.vaultUri
output keyVaultId string = kv.id
output keyVaultName string = kv.name
