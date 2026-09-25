param location string
param prefix string

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-appi'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logs.id
  }
}

// Live telemetry dashboard — users, activity, latency, errors and logs — as an Azure Monitor
// Workbook bound to this project's App Insights. The workbook content is generic (parameterised
// by time range + cloud role), so the same JSON drops into any project in the subscription:
// add this resource to that project's observability module pointed at its own `appi`.
resource telemetryWorkbook 'Microsoft.Insights/workbooks@2023-06-01' = {
  name: guid(appi.id, 'telemetry-workbook')
  location: location
  kind: 'shared'
  properties: {
    displayName: '${prefix} — Service telemetry'
    serializedData: loadTextContent('../observability/telemetry.workbook.json')
    category: 'workbook'
    sourceId: appi.id
    version: 'Notebook/1.0'
  }
}

output connectionString string = appi.properties.ConnectionString
output appInsightsId string = appi.id
output workbookId string = telemetryWorkbook.id
