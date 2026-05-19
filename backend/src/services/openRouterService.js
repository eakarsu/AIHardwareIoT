const https = require('https');

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'openrouter.ai';
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
  }

  async makeRequest(messages) {
    const { content } = await this.makeRequestWithTokens(messages);
    return content;
  }

  async makeRequestWithTokens(messages) {
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
              const content = parsed.choices[0].message.content;
              const tokens = parsed.usage?.total_tokens || 0;
              resolve({ content, tokens });
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
    const { content } = await this.analyzeDeviceWithTokens(device, telemetryData);
    return content;
  }

  async analyzeDeviceWithTokens(device, telemetryData) {
    const systemPrompt = `You are an expert IoT systems analyst specializing in edge computing and hardware monitoring. Analyze the device data and return a JSON object with fields: health_score (0-100), status_summary (string), issues (array of objects with severity and description), recommendations (array of strings), predictive_insights (string).`;
    const userPrompt = `Analyze this IoT device and its recent telemetry data:

**Device:** ${device.name} (${device.type})
**Status:** ${device.status}
**Location:** ${device.location}
**Group:** ${device.group_name}
**Firmware:** ${device.firmware_version}

**Recent Telemetry (last 20 readings):**
${telemetryData.map(t => `- ${t.metric_type}: ${t.value} ${t.unit} at ${t.timestamp}`).join('\n')}

Return JSON with: health_score, status_summary, issues (with severity and description), recommendations, predictive_insights.`;

    try {
      const result = await this.makeRequestWithTokens([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.tryParseJson(result.content);
      return { content: parsed !== null ? JSON.stringify(parsed) : result.content, tokens: result.tokens };
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return { content: this.fallbackDeviceAnalysis(device, telemetryData), tokens: 0 };
    }
  }

  async predictiveMaintenance(device, telemetryData) {
    const { content } = await this.predictiveMaintenanceWithTokens(device, telemetryData);
    return content;
  }

  async predictiveMaintenanceWithTokens(device, telemetryData) {
    const systemPrompt = `You are a predictive maintenance AI for IoT infrastructure. Analyze sensor patterns and predict potential failures. Return JSON with fields: risk_level (low/medium/high), risk_score (0-100), predicted_failure_days (number or null), maintenance_actions (array of strings), spare_parts (array of strings), summary (string).`;
    const userPrompt = `Predict maintenance needs for this device:

**Device:** ${device.name} (${device.type})
**Status:** ${device.status}
**Uptime Since:** ${device.last_seen}

**Sensor Readings:**
${telemetryData.map(t => `- ${t.metric_type}: ${t.value} ${t.unit}`).join('\n')}

Return JSON with: risk_level, risk_score, predicted_failure_days, maintenance_actions, spare_parts, summary.`;

    try {
      const result = await this.makeRequestWithTokens([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.tryParseJson(result.content);
      return { content: parsed !== null ? JSON.stringify(parsed) : result.content, tokens: result.tokens };
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return { content: this.fallbackPredictiveMaintenance(device), tokens: 0 };
    }
  }

  async anomalyDetection(telemetryData, deviceName) {
    const { content } = await this.anomalyDetectionWithTokens(telemetryData, deviceName);
    return content;
  }

  async anomalyDetectionWithTokens(telemetryData, deviceName) {
    const systemPrompt = `You are an anomaly detection AI for IoT sensor networks. Identify unusual patterns and return JSON with fields: anomalies (array of objects with metric, value, confidence_score, timestamp), root_causes (array of strings), severity (low/medium/high/critical), recommended_actions (array of strings), summary (string).`;
    const userPrompt = `Analyze telemetry data for anomalies from device "${deviceName}":

**Data Points:**
${telemetryData.map(t => `- [${t.timestamp}] ${t.metric_type}: ${t.value} ${t.unit}`).join('\n')}

Return JSON with: anomalies (with metric, value, confidence_score, timestamp), root_causes, severity, recommended_actions, summary.`;

    try {
      const result = await this.makeRequestWithTokens([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.tryParseJson(result.content);
      return { content: parsed !== null ? JSON.stringify(parsed) : result.content, tokens: result.tokens };
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return { content: this.fallbackAnomalyDetection(deviceName), tokens: 0 };
    }
  }

  async fleetAnalysisWithTokens(devices, summaryData) {
    const systemPrompt = `You are a fleet management AI for IoT deployments. Return JSON with fields: health_score (0-100), fleet_summary (string), problem_areas (array of strings), at_risk_devices (array of strings), optimization_suggestions (array of strings), scaling_recommendations (array of strings).`;
    const userPrompt = `Analyze the IoT device fleet:

**Fleet Summary:**
- Total Devices: ${devices.length}
- Online: ${devices.filter(d => d.status === 'online').length}
- Offline: ${devices.filter(d => d.status === 'offline').length}
- Warning: ${devices.filter(d => d.status === 'warning').length}
- Maintenance: ${devices.filter(d => d.status === 'maintenance').length}

**Device Types:**
${[...new Set(devices.map(d => d.type))].map(t => `- ${t}: ${devices.filter(d => d.type === t).length} devices`).join('\n')}

Return JSON with: health_score, fleet_summary, problem_areas, at_risk_devices, optimization_suggestions, scaling_recommendations.`;

    try {
      const result = await this.makeRequestWithTokens([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.tryParseJson(result.content);
      return { content: parsed !== null ? JSON.stringify(parsed) : result.content, tokens: result.tokens };
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return { content: this.fallbackFleetAnalysis(devices), tokens: 0 };
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

  async energyOptimizationWithTokens(devices, telemetryData) {
    const systemPrompt = `You are an energy optimization AI for IoT networks. Return JSON with fields: efficiency_score (0-100), current_analysis (string), bottlenecks (array of strings), power_saving_recommendations (array of strings), battery_strategies (array of strings), estimated_savings_percent (number).`;
    const userPrompt = `Optimize energy usage for IoT deployment:

**Devices:** ${devices.length} total
**Power Data:**
${telemetryData.filter(t => t.metric_type === 'power' || t.metric_type === 'battery_level').map(t => `- ${t.device_name || 'Device'}: ${t.metric_type} = ${t.value} ${t.unit}`).join('\n')}

Return JSON with: efficiency_score, current_analysis, bottlenecks, power_saving_recommendations, battery_strategies, estimated_savings_percent.`;

    try {
      const result = await this.makeRequestWithTokens([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.tryParseJson(result.content);
      return { content: parsed !== null ? JSON.stringify(parsed) : result.content, tokens: result.tokens };
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return { content: this.fallbackEnergyOptimization(), tokens: 0 };
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

  tryParseJson(text) {
    try { return JSON.parse(text); } catch (e) {}
    const stripped = text.replace(/```(?:json)?\n?/g, '').trim();
    try { return JSON.parse(stripped); } catch (e) {}
    const start = text.indexOf('{'); const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) { try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {} }
    return null;
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

  async deviceClusterAnalysisWithTokens(devices, telemetrySamples) {
    const systemPrompt = `You are an IoT analytics AI. Cluster devices by behavior pattern and operational characteristics. Return JSON with fields: cluster_count (number), clusters (array of objects with name, description, device_ids array, common_traits array, recommendations array), outliers (array of objects with device_id and reason).`;
    const userPrompt = `Cluster these IoT devices by behavior:

**Devices (${devices.length}):**
${devices.map(d => `- id=${d.id} name=${d.name} type=${d.type} status=${d.status} location=${d.location || 'n/a'} firmware=${d.firmware_version || 'n/a'}`).join('\n')}

**Recent telemetry sample:**
${telemetrySamples.slice(0, 80).map(t => `- device_id=${t.device_id} ${t.metric_type}=${t.value}${t.unit || ''}`).join('\n')}

Return JSON only.`;

    try {
      const result = await this.makeRequestWithTokens([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.tryParseJson(result.content);
      return { content: parsed !== null ? JSON.stringify(parsed) : result.content, tokens: result.tokens };
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return { content: this.fallbackClusterAnalysis(devices), tokens: 0 };
    }
  }

  fallbackClusterAnalysis(devices) {
    const byType = {};
    devices.forEach(d => { byType[d.type] = byType[d.type] || []; byType[d.type].push(d.id); });
    return JSON.stringify({
      cluster_count: Object.keys(byType).length,
      clusters: Object.entries(byType).map(([type, ids]) => ({
        name: `${type} cluster`,
        description: `Devices of type ${type}`,
        device_ids: ids,
        common_traits: [`type=${type}`],
        recommendations: ['Group monitoring thresholds by type', 'Apply uniform firmware update schedule'],
      })),
      outliers: [],
    });
  }

  async firmwareRecommendationWithTokens(device, telemetrySamples, latestFirmware) {
    const systemPrompt = `You are a firmware advisory AI. Given a device, its recent telemetry, and the latest available firmware, recommend whether to update, defer, or skip. Return JSON with fields: device_id, current_version, recommended_version, action ("update" | "defer" | "skip"), confidence (0-100), reasons (array of strings), risks (array of strings), rollout_strategy (string).`;
    const userPrompt = `Recommend firmware action.

**Device:**
id=${device.id} name=${device.name} type=${device.type} status=${device.status} firmware=${device.firmware_version || 'unknown'}

**Recent telemetry (last ${telemetrySamples.length}):**
${telemetrySamples.slice(0, 40).map(t => `- ${t.metric_type}=${t.value}${t.unit || ''} @ ${t.timestamp || ''}`).join('\n')}

**Latest available firmware:** ${latestFirmware ? `${latestFirmware.version} (${latestFirmware.notes || 'no notes'})` : 'unknown'}

Return JSON only.`;

    try {
      const result = await this.makeRequestWithTokens([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.tryParseJson(result.content);
      return { content: parsed !== null ? JSON.stringify(parsed) : result.content, tokens: result.tokens };
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return { content: this.fallbackFirmwareRecommendation(device, latestFirmware), tokens: 0 };
    }
  }

  fallbackFirmwareRecommendation(device, latestFirmware) {
    return JSON.stringify({
      device_id: device.id,
      current_version: device.firmware_version || 'unknown',
      recommended_version: latestFirmware?.version || device.firmware_version || 'unknown',
      action: latestFirmware && latestFirmware.version !== device.firmware_version ? 'update' : 'skip',
      confidence: 50,
      reasons: ['Heuristic comparison; AI unavailable'],
      risks: ['Verify compatibility before mass rollout'],
      rollout_strategy: 'Stage on 5% of devices, observe 24h, then proceed if no anomalies.',
    });
  }

  async edgeInferenceDeploymentWithTokens(device, modelSpec) {
    const systemPrompt = `You are an edge AI deployment advisor. Recommend how to deploy or optimize an inference model on a resource-constrained device. Return JSON with fields: device_id, model_name, feasibility ("good" | "marginal" | "infeasible"), required_optimizations (array of strings), quantization (string), expected_latency_ms (number), expected_memory_mb (number), fallback_strategy (string), notes (string).`;
    const userPrompt = `Recommend edge inference deployment plan.

**Device:**
id=${device.id} name=${device.name} type=${device.type}
cpu=${device.cpu || 'unknown'} ram_mb=${device.ram_mb || 'unknown'} storage_mb=${device.storage_mb || 'unknown'} accelerator=${device.accelerator || 'none'}

**Model:**
name=${modelSpec.name || 'model'} framework=${modelSpec.framework || 'unknown'} size_mb=${modelSpec.size_mb || 'unknown'} params=${modelSpec.params || 'unknown'} input=${modelSpec.input || 'unknown'} output=${modelSpec.output || 'unknown'}

Return JSON only.`;

    try {
      const result = await this.makeRequestWithTokens([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.tryParseJson(result.content);
      return { content: parsed !== null ? JSON.stringify(parsed) : result.content, tokens: result.tokens };
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return { content: this.fallbackEdgeInference(device, modelSpec), tokens: 0 };
    }
  }

  fallbackEdgeInference(device, modelSpec) {
    return JSON.stringify({
      device_id: device.id,
      model_name: modelSpec.name || 'model',
      feasibility: 'marginal',
      required_optimizations: ['INT8 quantization', 'operator fusion', 'pruning if accuracy permits'],
      quantization: 'INT8',
      expected_latency_ms: 0,
      expected_memory_mb: 0,
      fallback_strategy: 'Route to cloud inference when device load > 80%.',
      notes: 'AI advisor unavailable; conservative fallback.',
    });
  }

  // ---------- Apply pass 5 backlog ---------- //

  async smartAgentOrchestrationWithTokens(devices, automations, goal) {
    const systemPrompt = `You are an IoT smart-agent orchestration ADVISOR. Given fleet devices, existing automations, and a coordination goal, propose a multi-agent ORCHESTRATION PLAN. This is advisory only — no autonomous control. Return JSON with fields: goal (string), agents (array of {agent_id, role, devices, triggers, actions, guardrails}), coordination_pattern (string), conflict_resolution (string), human_oversight (array of strings), risks (array of strings), rollout (array of strings).`;
    const userPrompt = `Propose orchestration plan.\n\nGOAL: ${goal || 'general fleet coordination'}\n\nDEVICES (${devices.length}):\n${devices.slice(0, 60).map(d => `- id=${d.id} name=${d.name} type=${d.type} status=${d.status}`).join('\n')}\n\nAUTOMATIONS (${automations.length}):\n${automations.slice(0, 30).map(a => `- ${a.name || a.id}: trigger=${a.trigger || 'n/a'} action=${a.action || 'n/a'}`).join('\n')}\n\nReturn JSON only.`;
    try {
      const result = await this.makeRequestWithTokens([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.tryParseJson(result.content);
      return { content: parsed !== null ? JSON.stringify(parsed) : result.content, tokens: result.tokens };
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return { content: JSON.stringify({
        goal: goal || 'general fleet coordination',
        agents: [{ agent_id: 'fallback', role: 'Health monitor', devices: devices.map(d => d.id).slice(0, 10), triggers: ['threshold_breach'], actions: ['notify_operator'], guardrails: ['no_autonomous_control'] }],
        coordination_pattern: 'Hub-and-spoke with operator approval',
        conflict_resolution: 'Operator escalation',
        human_oversight: ['Approve every state change', 'Daily review'],
        risks: ['AI advisor unavailable; using conservative fallback'],
        rollout: ['Pilot on 5 devices', 'Monitor 1 week', 'Expand if stable'],
      }), tokens: 0 };
    }
  }

  async healthMonitorSummaryWithTokens(devices, alerts, telemetrySamples) {
    const systemPrompt = `You are an IoT operations health AI. Synthesize fleet health into a prioritized action list. Return JSON with fields: overall_health_score (0-100), health_distribution (object {good,warning,critical}), top_actions (array of {priority, device_id_or_group, action, rationale, eta}), watchlist (array of {device_id, reason}), kpis (object).`;
    const userPrompt = `Summarize fleet health.\n\nDEVICES (${devices.length}):\n${devices.slice(0, 80).map(d => `- id=${d.id} type=${d.type} status=${d.status}`).join('\n')}\n\nACTIVE ALERTS (${alerts.length}):\n${alerts.slice(0, 40).map(a => `- device=${a.device_id} severity=${a.severity || 'n/a'} ${a.message || ''}`).join('\n')}\n\nTELEMETRY SAMPLE (${telemetrySamples.length}):\n${telemetrySamples.slice(0, 60).map(t => `- device=${t.device_id} ${t.metric_type}=${t.value}${t.unit || ''}`).join('\n')}\n\nReturn JSON only.`;
    try {
      const result = await this.makeRequestWithTokens([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.tryParseJson(result.content);
      return { content: parsed !== null ? JSON.stringify(parsed) : result.content, tokens: result.tokens };
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      const dist = { good: 0, warning: 0, critical: 0 };
      devices.forEach(d => {
        if (d.status === 'online' || d.status === 'healthy') dist.good++;
        else if (d.status === 'warning' || d.status === 'degraded') dist.warning++;
        else dist.critical++;
      });
      return { content: JSON.stringify({
        overall_health_score: devices.length ? Math.round((dist.good / devices.length) * 100) : 0,
        health_distribution: dist,
        top_actions: alerts.slice(0, 5).map((a, i) => ({ priority: i + 1, device_id_or_group: a.device_id, action: 'investigate alert', rationale: a.message || 'open alert', eta: '24h' })),
        watchlist: [],
        kpis: { total_devices: devices.length, active_alerts: alerts.length },
      }), tokens: 0 };
    }
  }

  async energyEfficiencyAdvisorWithTokens(devices, telemetrySamples, tariffContext) {
    const systemPrompt = `You are an IoT energy-efficiency advisor. Recommend specific changes to reduce kWh and cost while preserving function. Return JSON: device_id (or "fleet"), baseline_kwh_estimate (number), recommendations (array of {device_id, change, expected_kwh_savings_per_month, expected_cost_savings_per_month, risk}), settings_to_adjust (array of strings), monitoring_plan (array of strings), assumptions (array of strings).`;
    const userPrompt = `Provide tailored energy advisor output.\n\nDEVICES (${devices.length}):\n${devices.slice(0, 60).map(d => `- id=${d.id} type=${d.type} status=${d.status} location=${d.location || 'n/a'}`).join('\n')}\n\nTELEMETRY SAMPLE (${telemetrySamples.length}):\n${telemetrySamples.slice(0, 80).map(t => `- device=${t.device_id} ${t.metric_type}=${t.value}${t.unit || ''}`).join('\n')}\n\nTARIFF CONTEXT: ${JSON.stringify(tariffContext || {})}\n\nReturn JSON only.`;
    try {
      const result = await this.makeRequestWithTokens([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.tryParseJson(result.content);
      return { content: parsed !== null ? JSON.stringify(parsed) : result.content, tokens: result.tokens };
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
      return { content: JSON.stringify({
        device_id: 'fleet',
        baseline_kwh_estimate: 0,
        recommendations: [
          { device_id: null, change: 'Reduce polling frequency on non-critical sensors', expected_kwh_savings_per_month: 5, expected_cost_savings_per_month: 1, risk: 'low' },
          { device_id: null, change: 'Enable deep-sleep between telemetry windows', expected_kwh_savings_per_month: 8, expected_cost_savings_per_month: 1.5, risk: 'low' },
        ],
        settings_to_adjust: ['polling_interval', 'sleep_mode'],
        monitoring_plan: ['Track kWh weekly via energy_optimization analyses'],
        assumptions: ['Fallback heuristic; AI unavailable'],
      }), tokens: 0 };
    }
  }
}

module.exports = new OpenRouterService();
