import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import reconcileRoutes from "./routes/reconcile.routes.js";
import connectToMongoDB from "./db/db.js";

dotenv.config();

const app = express();

app.use(
  cors({
    credentials: true,
    origin: process.env.frontend_base_url,
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/reconcile", reconcileRoutes);
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Hello World!!");
});

app.listen(PORT, () => {
  connectToMongoDB();
  console.log(`Server Running on port ${PORT}`);
});
