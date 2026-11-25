const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    adminEmail: { type: String, required: true, trim: true, lowercase: true },
    action: { type: String, required: true, trim: true, maxlength: 120 },
    entityType: { type: String, trim: true, maxlength: 60, default: "system" },
    entityId: { type: String, trim: true, maxlength: 80, default: "" },
    summary: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { timestamps: true, versionKey: false },
);

module.exports =
  mongoose.models.AdminAuditLog ||
  mongoose.model("AdminAuditLog", auditLogSchema);
