const jwt = require("jsonwebtoken");
const service = require("./service");

const COOKIE = "delivery_session";
const COOKIE_AGE = 12 * 60 * 60 * 1000;

function cookieOptions(res) {
  return {
    httpOnly: true,
    secure: res.app.locals.isProduction,
    sameSite: res.app.locals.isProduction ? "none" : "lax",
    maxAge: COOKIE_AGE,
    path: "/",
  };
}

async function login(req, res) {
  const agent = await service.login(req.body || {});
  if (!agent) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  const token = jwt.sign(
    {
      sub: agent.id,
      role: "delivery_staff",
      staffRole: agent.staffRole,
      authVersion: agent.authVersion,
    },
    req.app.locals.jwtSecret,
    { expiresIn: "12h" },
  );
  res.cookie(COOKIE, token, cookieOptions(res));
  return res.json({ agent });
}

async function createApplication(req, res) {
  const application = await service.createApplication(
    req.body || {},
    req.app.locals.jwtSecret,
  );
  return res.status(201).json(application);
}

async function createHubApplication(req, res) {
  return res.status(201).json(
    await service.createHubApplication(req.body || {}),
  );
}

async function uploadApplicationFile(req, res) {
  const result = await service.uploadApplicationFile(
    req.get("x-application-token"),
    req.get("x-application-file-kind"),
    { body: req.body, contentType: req.get("content-type") },
  );
  return res.json(result);
}

function me(req, res) {
  return res.json({ agent: service.publicAgent(req.deliveryAgent) });
}

function logout(_req, res) {
  res.clearCookie(COOKIE, { ...cookieOptions(res), maxAge: undefined });
  return res.json({ message: "You have been signed out." });
}

async function changePassword(req, res) {
  const agent = await service.changePassword(
    req.deliveryAgent._id,
    req.body || {},
  );
  const token = jwt.sign(
    {
      sub: agent.id,
      role: "delivery_staff",
      staffRole: agent.staffRole,
      authVersion: agent.authVersion,
    },
    req.app.locals.jwtSecret,
    { expiresIn: "12h" },
  );
  res.cookie(COOKIE, token, cookieOptions(res));
  return res.json({ agent });
}

async function setAvailability(req, res) {
  return res.json({
    agent: await service.setAgentOnline(
      req.deliveryAgent._id,
      req.body?.isOnline,
    ),
  });
}

async function tasks(req, res) {
  return res.json(await service.listTasks(req.deliveryAgent._id));
}

async function earnings(req, res) {
  return res.json(await service.getEarnings(req.deliveryAgent, req.query));
}

async function addTaskEvent(req, res) {
  return res.json({
    task: await service.addTaskEvent(
      req.deliveryAgent._id,
      req.params.orderId,
      req.body || {},
    ),
  });
}

async function hubTasks(req, res) {
  return res.json(
    await service.listHubTasks(req.deliveryAgent.hub),
  );
}

async function addHubTaskEvent(req, res) {
  return res.json({
    task: await service.addHubTaskEvent(
      req.deliveryAgent._id,
      req.params.orderId,
      req.body || {},
      req.deliveryAgent.hub,
    ),
  });
}

async function addReverseTaskEvent(req, res) {
  return res.json({
    task: await service.addReverseTaskEvent(
      req.deliveryAgent._id,
      req.params.id,
      req.body || {},
    ),
  });
}

async function addHubReverseTaskEvent(req, res) {
  return res.json({
    task: await service.addHubReverseTaskEvent(
      req.deliveryAgent._id,
      req.params.id,
      req.body || {},
    ),
  });
}

module.exports = {
  login,
  createApplication,
  createHubApplication,
  uploadApplicationFile,
  me,
  logout,
  changePassword,
  setAvailability,
  tasks,
  earnings,
  addTaskEvent,
  hubTasks,
  addHubTaskEvent,
  addReverseTaskEvent,
  addHubReverseTaskEvent,
};
