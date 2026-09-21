targetScope = 'resourceGroup'

@description('Environment name, e.g. dev or prod')
param env string
@description('Azure region')
param location string = resourceGroup().location

var prefix = 'wsww-${env}'

module obs 'modules/observability.bicep' = {
  name: 'observability'
  params: { location: location, prefix: prefix }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: { location: location, prefix: prefix }
}

module kv 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: { location: location, prefix: prefix }
}

module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos'
  params: { location: location, prefix: prefix }
}

module functions 'modules/functions.bicep' = {
  name: 'functions'
  params: {
    location: location
    prefix: prefix
    env: env
    appInsightsConnectionString: obs.outputs.connectionString
    cosmosEndpoint: cosmos.outputs.endpoint
    keyVaultUri: kv.outputs.keyVaultUri
  }
}

module identity 'modules/identity.bicep' = {
  name: 'identity'
  params: {
    principalId: functions.outputs.principalId
    keyVaultName: kv.outputs.keyVaultName
    storageAccountName: storage.outputs.storageAccountName
    deployStorageAccountName: functions.outputs.deployStorageName
    cosmosAccountName: cosmos.outputs.accountName
  }
}

output apiHostName string = functions.outputs.defaultHostName
output functionAppName string = functions.outputs.functionAppName
output cosmosEndpoint string = cosmos.outputs.endpoint
output keyVaultUri string = kv.outputs.keyVaultUri
