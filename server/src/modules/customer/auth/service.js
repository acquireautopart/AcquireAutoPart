const bcrypt = require("bcryptjs");
const Customer = require("../models/Customer");
const HttpError = require("../../../utils/HttpError");

async function registerCustomer({ name, email, password, marketCountry }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const customerData = { name, email, passwordHash };
  if (marketCountry) customerData.marketCountry = marketCountry;

  try {
    return await Customer.create(customerData);
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, "An account with this email already exists.");
    }
    throw error;
  }
}

async function authenticateCustomer({ email, password, marketCountry }) {
  const customer = await Customer.findOne({ email })
    .select("+passwordHash")
    .lean();
  if (!customer) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, customer.passwordHash);
  if (!passwordMatches) return null;
  if (marketCountry && marketCountry !== customer.marketCountry) {
    await Customer.updateOne(
      { _id: customer._id },
      { $set: { marketCountry } },
    );
    customer.marketCountry = marketCountry;
  }
  return customer;
}

module.exports = { registerCustomer, authenticateCustomer };
