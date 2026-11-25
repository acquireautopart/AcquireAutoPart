/**
 * Jest configuration for `npm run test:unit` (`jest src/modules/tracking`).
 *
 * The run covers two styles of spec:
 *   - pure unit specs (for example `services/routePlanner.spec.js`);
 *   - integration specs that boot the whole Express app with `supertest` and a
 *     real MongoDB provided by `mongodb-memory-server`.
 *
 * Booting an in-memory MongoDB (and, on a cold machine, downloading its binary)
 * takes longer than the 5s Jest default, so the per-test timeout is raised.
 */
module.exports = {
  testEnvironment: "node",
  testTimeout: 60000,
};
