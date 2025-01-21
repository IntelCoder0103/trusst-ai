const fs = require("fs");
const path = require("path");
const { docClient } = require("../dynamoDB");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuid } = require('uuid');
const { ScanCommand } = require("@aws-sdk/client-dynamodb");

const CALL_INTENTS_TABLE = process.env.CALL_INTENTS_TABLE;

/**
 * Controller for seeding call intents
 * @param {*} req Request
 * @param {*} res Response
 * @returns 
 */
module.exports = async function seedCallIntents(req, res) {
  // Read text file from data/call-intents.txt
  const dataPath = path.join(__dirname, "call_intents.txt");

  try {
    const data = fs.readFileSync(dataPath, "utf8");
    const lines = data.split("\n").filter((line) => line.trim() !== "");

    // Check if the data is already seeded
    const command = new ScanCommand({TableName: CALL_INTENTS_TABLE});
    const { Items } = await docClient.send(command);
    if (Items && Items.length > 0) {
      return res.json({ message: "Call intents already seeded" });
    }

    for (let i = 0; i < lines.length; i += 20) {
      const batches = lines.slice(i, i + 20);
      // Create a batch writer
      const batchWriteCommand = new BatchWriteCommand({
        RequestItems: {
          [CALL_INTENTS_TABLE]: batches.map((intent) => ({
            PutRequest: { Item: { intent, call_id: uuid() } },
          })),
        },
      });
      await docClient.send(batchWriteCommand);
    }

    res.json({ message: "Call intents seeded successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not seed call intents" });
  }

}