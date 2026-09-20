param location string
param prefix string
param appInsightsConnectionString string
param cosmosEndpoint string
param keyVaultUri string
param env string

var storageName = take(toLower(replace('${prefix}fnst', '-', '')), 24)

resource fnstorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: { minimumTlsVersion: 'TLS1_2', allowBlobPublicAccess: false }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${prefix}-flex'
  location: location
  sku: { tier: 'FlexConsumption', name: 'FC1' }
  properties: { reserved: true }
}

resource deployContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: '${fnstorage.name}/default/app-package'
  properties: { publicAccess: 'None' }
}

resource fn 'Microsoft.Web/sites@2023-12-01' = {
  name: '${prefix}-api'
  location: location
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${fnstorage.properties.primaryEndpoints.blob}app-package'
          authentication: { type: 'SystemAssignedIdentity' }
        }
      }
      scaleAndConcurrency: { maximumInstanceCount: 40, instanceMemoryMB: 2048 }
      runtime: { name: 'python', version: '3.12' }
    }
    siteConfig: {
      appSettings: [
        { name: 'AzureWebJobsStorage__accountName', value: fnstorage.name }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
        { name: 'WSWW_ENV', value: env }
        { name: 'WSWW_COSMOS_ENDPOINT', value: cosmosEndpoint }
        { name: 'WSWW_COSMOS_DATABASE', value: 'wsww' }
        { name: 'WSWW_KEYVAULT_URI', value: keyVaultUri }
        { name: 'WSWW_SIGNING_KEY_NAME', value: 'wsww-api-signing' }
      ]
    }
  }
}

output principalId string = fn.identity.principalId
output functionAppName string = fn.name
output defaultHostName string = fn.properties.defaultHostName
output deployStorageId string = fnstorage.id
