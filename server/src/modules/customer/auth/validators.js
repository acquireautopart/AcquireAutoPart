const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getCredentials(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Enter a valid name, email address, and password." };
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 80) {
    return { error: "Name must be between 2 and 80 characters." };
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return {
      error:
        "Password must be at least 8 characters and no more than 72 bytes.",
    };
  }

  return { name, email, password };
}

function getLoginCredentials(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Enter your email address and password." };
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (
    email.length > 254 ||
    !emailPattern.test(email) ||
    !password ||
    password.length > 72
  ) {
    return { error: "Enter a valid email address and password." };
  }

  return { email, password };
}

module.exports = { getCredentials, getLoginCredentials };
