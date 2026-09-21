param principalId string
param keyVaultName string
param storageAccountName string
param deployStorageAccountName string
param cosmosAccountName string

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = { name: keyVaultName }
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = { name: storageAccountName }
resource deployStorage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = { name: deployStorageAccountName }
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' existing = { name: cosmosAccountName }

// Key Vault Crypto User
resource kvCrypto 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: kv
  name: guid(kv.id, principalId, '12338af0-0e69-4776-bea7-57ae8d297424')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '12338af0-0e69-4776-bea7-57ae8d297424')
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

// Storage Blob Data Contributor
resource blobContrib 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storage
  name: guid(storage.id, principalId, 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

// Cosmos DB Built-in Data Contributor (data-plane SQL role)
resource cosmosData 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-11-15' = {
  parent: cosmos
  name: guid(cosmos.id, principalId, '00000000-0000-0000-0000-000000000002')
  properties: {
    roleDefinitionId: '${cosmos.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
    principalId: principalId
    scope: cosmos.id
  }
}

// Storage Blob Data Owner on the deployment storage (Flex Consumption needs this)
resource deployBlobOwner 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: deployStorage
  name: guid(deployStorage.id, principalId, 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b')
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
