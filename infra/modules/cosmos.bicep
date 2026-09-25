param location string
param prefix string
@description('Log Analytics workspace resource id for audit logs (empty = skip diagnostics)')
param workspaceId string = ''

resource account 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = {
  name: take(toLower('${prefix}-cosmos'), 44)
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: false
    capabilities: [
      { name: 'EnableServerless' }
      { name: 'EnableNoSQLVectorSearch' }
    ]
    consistencyPolicy: { defaultConsistencyLevel: 'Session' }
    locations: [ { locationName: location, failoverPriority: 0 } ]
    disableLocalAuth: true
  }
}

resource db 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-11-15' = {
  parent: account
  name: 'wsww'
  properties: { resource: { id: 'wsww' } }
}

var simpleContainers = [
  { name: 'users', pk: '/id' }
  { name: 'sessions', pk: '/userId' }
  { name: 'decisions', pk: '/userId' }
  { name: 'shortlist', pk: '/userId' }
  { name: 'followups', pk: '/userId' }
  { name: 'taste', pk: '/userId' }
  { name: 'refreshTokens', pk: '/userId' }
]

resource containers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = [
  for c in simpleContainers: {
    parent: db
    name: c.name
    properties: {
      resource: {
        id: c.name
        partitionKey: { paths: [ c.pk ], kind: 'Hash' }
      }
    }
  }
]

// catalog carries a 3072-dim cosine vector on /embedding for recommendation search
resource catalog 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = {
  parent: db
  name: 'catalog'
  properties: {
    resource: {
      id: 'catalog'
      partitionKey: { paths: [ '/country' ], kind: 'Hash' }
      vectorEmbeddingPolicy: {
        vectorEmbeddings: [
          { path: '/embedding', dataType: 'float32', distanceFunction: 'cosine', dimensions: 3072 }
        ]
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [ { path: '/*' } ]
        excludedPaths: [ { path: '/embedding/*' } ]
        vectorIndexes: [ { path: '/embedding', type: 'diskANN' } ]
      }
    }
  }
}

// Audit control- and data-plane requests to Log Analytics (who read/wrote what, and admin ops).
resource cosmosAudit 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = if (!empty(workspaceId)) {
  scope: account
  name: 'audit-to-logs'
  properties: {
    workspaceId: workspaceId
    logs: [
      { category: 'DataPlaneRequests', enabled: true }
      { category: 'ControlPlaneRequests', enabled: true }
    ]
    metrics: [ { category: 'Requests', enabled: true } ]
  }
}

output accountName string = account.name
output endpoint string = account.properties.documentEndpoint
output accountId string = account.id
