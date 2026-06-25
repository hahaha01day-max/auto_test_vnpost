function buildOrganizationData(testInfo, overrides = {}) {
  const runId = `${Date.now()}_${testInfo.workerIndex}`;
  const suffix = runId.replace(/\D/g, '').slice(-10);

  return {
    unitCode: `AUTO_${suffix}`,
    unitName: `AUTO_ORG_${suffix}`,
    parentCode: process.env.VNPOST_ORG_PARENT_CODE || undefined,
    ...overrides,
  };
}

module.exports = { buildOrganizationData };
