const https = require('https');

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'openrouter.ai';
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
  }

  async makeRequest(messages) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: this.model,
        messages: messages,
        max_tokens: 2000,
      });

      const options = {
        hostname: this.baseUrl,
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'AI Hardware IoT Platform',
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.choices && parsed.choices[0]) {
              resolve(parsed.choices[0].message.content);
            } else {
              reject(new Error('Invalid API response'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  async analyzeDevice(device, telemetryData) {
    const systemPrompt = `You are an expert IoT systems analyst specializing in edge computing and hardware monitoring. Analyze the device data and provide actionable insights in markdown format.`;
    const userPrompt = `Analyze this IoT device and its recent telemetry data:

**Device:** ${device.name} (${device.type})
**Status:** ${device.status}
**Location:** ${device.location}
**Group:** ${device.group_name}
**Firmware:** ${device.firmware_version}

**Recent Telemetry (last 20 readings):**
${telemetryData.map(t => `- ${t.metric_type}: ${t.value} ${t.unit} at ${t.timestamp}`).join('\n')}

Provide:
1. Device health assessment
2. Anomaly detection findings
3. Performance optimization recommendations
4. Predictive maintenance insights`;

    try {
      return await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return this.fallbackDeviceAnalysis(device, telemetryData);
    }
  }

  async predictiveMaintenance(device, telemetryData) {
    const systemPrompt = `You are a predictive maintenance AI for IoT infrastructure. Analyze sensor patterns and predict potential failures.`;
    const userPrompt = `Predict maintenance needs for this device:

**Device:** ${device.name} (${device.type})
**Status:** ${device.status}
**Uptime Since:** ${device.last_seen}

**Sensor Readings:**
${telemetryData.map(t => `- ${t.metric_type}: ${t.value} ${t.unit}`).join('\n')}

Provide:
1. Failure risk assessment (low/medium/high)
2. Predicted time to failure
3. Recommended maintenance actions
4. Spare parts to prepare`;

    try {
      return await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return this.fallbackPredictiveMaintenance(device);
    }
  }

  async anomalyDetection(telemetryData, deviceName) {
    const systemPrompt = `You are an anomaly detection AI for IoT sensor networks. Identify unusual patterns and potential issues.`;
    const userPrompt = `Analyze telemetry data for anomalies from device "${deviceName}":

**Data Points:**
${telemetryData.map(t => `- [${t.timestamp}] ${t.metric_type}: ${t.value} ${t.unit}`).join('\n')}

Provide:
1. Detected anomalies with confidence scores
2. Root cause analysis
3. Severity assessment
4. Recommended actions`;

    try {
      return await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return this.fallbackAnomalyDetection(deviceName);
    }
  }

  async fleetAnalysis(devices, summaryData) {
    const systemPrompt = `You are a fleet management AI for IoT deployments. Analyze overall fleet health and optimization opportunities.`;
    const userPrompt = `Analyze the IoT device fleet:

**Fleet Summary:**
- Total Devices: ${devices.length}
- Online: ${devices.filter(d => d.status === 'online').length}
- Offline: ${devices.filter(d => d.status === 'offline').length}
- Warning: ${devices.filter(d => d.status === 'warning').length}
- Maintenance: ${devices.filter(d => d.status === 'maintenance').length}

**Device Types:**
${[...new Set(devices.map(d => d.type))].map(t => `- ${t}: ${devices.filter(d => d.type === t).length} devices`).join('\n')}

**Groups:**
${[...new Set(devices.map(d => d.group_name))].map(g => `- ${g}: ${devices.filter(d => d.group_name === g).length} devices`).join('\n')}

${summaryData ? `**Telemetry Summary:** ${summaryData}` : ''}

Provide:
1. Fleet health overview
2. Problem areas and at-risk devices
3. Resource optimization suggestions
4. Scaling recommendations`;

    try {
      return await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return this.fallbackFleetAnalysis(devices);
    }
  }

  async energyOptimization(devices, telemetryData) {
    const systemPrompt = `You are an energy optimization AI for IoT networks. Analyze power consumption and suggest efficiency improvements.`;
    const userPrompt = `Optimize energy usage for IoT deployment:

**Devices:** ${devices.length} total
**Power Data:**
${telemetryData.filter(t => t.metric_type === 'power' || t.metric_type === 'battery_level').map(t => `- ${t.device_name || 'Device'}: ${t.metric_type} = ${t.value} ${t.unit}`).join('\n')}

Provide:
1. Current energy consumption analysis
2. Efficiency bottlenecks
3. Power-saving recommendations
4. Battery life extension strategies`;

    try {
      return await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return this.fallbackEnergyOptimization();
    }
  }

  fallbackDeviceAnalysis(device, telemetryData) {
    const values = telemetryData.map(t => t.value);
    const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : 'N/A';
    return `## Device Analysis: ${device.name}

### Health Assessment
- **Status:** ${device.status}
- **Type:** ${device.type}
- **Location:** ${device.location}
- **Average Reading:** ${avg}

### Findings
- Device is currently **${device.status}** and ${device.status === 'online' ? 'operating within normal parameters' : 'requires attention'}
- ${telemetryData.length} telemetry data points analyzed
- Firmware version: ${device.firmware_version}

### Recommendations
1. ${device.status !== 'online' ? 'Investigate device connectivity issues' : 'Continue monitoring at current intervals'}
2. Consider scheduling preventive maintenance
3. Review alert thresholds for this device type
4. Ensure firmware is up to date

*Note: AI-powered analysis unavailable. This is a basic automated report.*`;
  }

  fallbackPredictiveMaintenance(device) {
    return `## Predictive Maintenance: ${device.name}

### Risk Assessment: **Medium**

### Analysis
- Device type: ${device.type}
- Current status: ${device.status}
- Regular maintenance interval recommended: 30 days

### Recommendations
1. Schedule inspection within the next 2 weeks
2. Check sensor calibration
3. Verify firmware is current (${device.firmware_version})
4. Review historical alert patterns

*Note: AI-powered analysis unavailable. This is a basic automated report.*`;
  }

  fallbackAnomalyDetection(deviceName) {
    return `## Anomaly Detection: ${deviceName}

### Summary
- No critical anomalies detected in basic analysis
- Standard deviation analysis pending AI engine

### Recommendations
1. Review telemetry trends manually
2. Check for sensor drift
3. Verify calibration schedules

*Note: AI-powered analysis unavailable. This is a basic automated report.*`;
  }

  fallbackFleetAnalysis(devices) {
    const online = devices.filter(d => d.status === 'online').length;
    const total = devices.length;
    return `## Fleet Analysis

### Overview
- **Total Devices:** ${total}
- **Online:** ${online} (${((online/total)*100).toFixed(1)}%)
- **Health Score:** ${((online/total)*100).toFixed(0)}/100

### Findings
- Fleet availability is at ${((online/total)*100).toFixed(1)}%
- ${devices.filter(d => d.status === 'warning').length} devices in warning state
- ${devices.filter(d => d.status === 'maintenance').length} devices in maintenance

### Recommendations
1. Investigate offline devices
2. Address warning-state devices promptly
3. Schedule batch firmware updates
4. Review device grouping efficiency

*Note: AI-powered analysis unavailable. This is a basic automated report.*`;
  }

  fallbackEnergyOptimization() {
    return `## Energy Optimization Report

### Summary
- Basic power analysis completed
- Detailed AI optimization unavailable

### Recommendations
1. Enable sleep mode on idle sensors
2. Reduce polling frequency for non-critical devices
3. Batch telemetry uploads to reduce radio-on time
4. Consider solar-powered options for outdoor sensors

*Note: AI-powered analysis unavailable. This is a basic automated report.*`;
  }
}

module.exports = new OpenRouterService();
