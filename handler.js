const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const express = require("express");
const serverless = require("serverless-http");
const seedCallIntents = require("./functions/seedCallIntents");
const clusterCallIntents = require("./functions/clusterCallIntents");

const app = express();

app.use(express.json());

app.get("/", async (req, res) => {
  res.json({ message: "Hello World" });
});

app.post("/seed", seedCallIntents);
app.post("/cluster", async (req, res) => {
  try {
    await clusterCallIntents();
    res.json({ message: "Call intents clustered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Could not cluster call intents" });
  }
});


app.get("/users/:userId", async (req, res) => {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);
    if (Item) {
      const { userId, name } = Item;
      res.json({ userId, name });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retrieve user" });
  }
});

app.post("/users", async (req, res) => {
  const { userId, name } = req.body;
  if (typeof userId !== "string") {
    res.status(400).json({ error: '"userId" must be a string' });
  } else if (typeof name !== "string") {
    res.status(400).json({ error: '"name" must be a string' });
  }

  const params = {
    TableName: USERS_TABLE,
    Item: { userId, name },
  };

  try {
    const command = new PutCommand(params);
    await docClient.send(command);
    res.json({ userId, name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create user" });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

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
