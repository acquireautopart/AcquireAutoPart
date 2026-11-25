const AdminSetting = require("../admin/models/AdminSetting");

async function getPlatformFeeRate() {
  const setting = await AdminSetting.findOne({ key: "marketplace" })
    .select("platformFeeRate")
    .lean();
  return Math.min(
    100,
    Math.max(
      0,
      Number(
        setting?.platformFeeRate ?? process.env.SELLER_PLATFORM_FEE_RATE,
      ) || 0,
    ),
  );
}

function calculateNetPayout(gross, discount, feeRate) {
  const eligibleGross = Math.max(0, Number(gross) - Number(discount || 0));
  return (
    Math.round(
      (eligibleGross - calculatePlatformFee(eligibleGross, feeRate)) * 100,
    ) / 100
  );
}

function calculatePlatformFee(commissionableAmount, feeRate) {
  const amount = Math.max(0, Number(commissionableAmount) || 0);
  const rate = Math.min(100, Math.max(0, Number(feeRate) || 0));
  return Math.round(amount * rate) / 100;
}

module.exports = {
  calculateNetPayout,
  calculatePlatformFee,
  getPlatformFeeRate,
};
