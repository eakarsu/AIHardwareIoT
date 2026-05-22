const express = require('express');

const router = express.Router();

let windows = [
  { id: 1, deviceClass: 'cold-chain-gateway', currentVersion: '3.8.2', targetVersion: '3.7.9', deadlineHours: 18, impactedDevices: 42, validation: 'canary passed', status: 'open' },
  { id: 2, deviceClass: 'vision-edge-node', currentVersion: '5.1.0', targetVersion: '5.0.6', deadlineHours: 6, impactedDevices: 11, validation: 'thermal regression', status: 'urgent' },
  { id: 3, deviceClass: 'pump-controller', currentVersion: '2.4.4', targetVersion: '2.4.1', deadlineHours: 30, impactedDevices: 19, validation: 'pending field sample', status: 'scheduled' }
];

router.get('/', (req, res) => {
  const summary = windows.reduce((acc, item) => {
    acc.total += 1;
    acc.impactedDevices += Number(item.impactedDevices || 0);
    acc.urgent += item.status === 'urgent' ? 1 : 0;
    return acc;
  }, { total: 0, impactedDevices: 0, urgent: 0 });
  res.json({ windows, summary });
});

router.post('/', (req, res) => {
  const item = {
    id: Date.now(),
    deviceClass: req.body.deviceClass || 'unclassified-device',
    currentVersion: req.body.currentVersion || 'unknown',
    targetVersion: req.body.targetVersion || 'previous-stable',
    deadlineHours: Number(req.body.deadlineHours || 24),
    impactedDevices: Number(req.body.impactedDevices || 0),
    validation: req.body.validation || 'rollback validation pending',
    status: req.body.status || 'open'
  };
  windows = [item, ...windows];
  res.status(201).json(item);
});

module.exports = router;
