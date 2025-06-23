import mongoose from "mongoose";
const reconciliationSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  fileA: Array,
  fileB: Array,
  result: Object,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Reconciliation", reconciliationSchema);
