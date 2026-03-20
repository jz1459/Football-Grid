import "dotenv/config";
import express from "express";
import cors from "cors";
import { playersRouter, searchHandler, validateHandler } from "./routes/players";
import { createSearchRateLimiter, createValidateRateLimiter } from "./middleware/rateLimit";

const app = express();
const port = process.env.PORT ?? 5001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.get("/test", (_req, res) => {
  res.send("Hello World");
});

app.post("/search_players", createSearchRateLimiter(), searchHandler);
app.post("/get_player", createValidateRateLimiter(), validateHandler);

app.use("/players", playersRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
