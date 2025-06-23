import express from "express";
import multer from "multer";
import { uploadAndReconcile } from "../controllers/reconcile.controllers.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();
const upload = multer();

router.post(
  "/upload",
  protectRoute,
  upload.fields([{ name: "fileA" }, { name: "fileB" }]),
  uploadAndReconcile
);

export default router;
