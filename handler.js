const express = require("express");
const serverless = require("serverless-http");
const cors = require('cors');
const seedCallIntents = require("./functions/seedCallIntents");
const clusterCallIntents = require("./functions/clusterCallIntents");
const getCallIntents = require("./functions/getCallIntents");

const app = express();

app.use(express.json());
app.use(cors());

app.get("/", async (req, res) => {
  res.json({ message: "Hello World" });
});

app.get("/intents", getCallIntents);
app.post("/seed", seedCallIntents);
app.post("/cluster", async (req, res) => {
  try {
    await clusterCallIntents();
    res.json({ message: "Call intents clustered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Could not cluster call intents" });
  }
});


app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

/**
 * Scheduled lambda function to cluster non-clustered call intents (20 items at a time)
 * @param {*} event 
 * @returns Returns the status of the function call
 */
exports.clusterCallIntentsScheduled = async (event) => {
  try {
    await clusterCallIntents();
    return { statusCode: 200, body: JSON.stringify({ message: "Call intents clustered successfully" }) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: "Could not cluster call intents" }) };
  }
}
exports.handler = serverless(app);
