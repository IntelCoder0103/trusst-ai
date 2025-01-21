const { docClient } = require("../dynamoDB");
const { v4: uuid } = require('uuid');
const { ScanCommand } = require("@aws-sdk/client-dynamodb");

const CALL_INTENTS_TABLE = process.env.CALL_INTENTS_TABLE;

/**
 * Controller for getting all call intents
 * @param {*} req Request
 * @param {*} res Response
 */
module.exports = async function getCallIntents(req, res) {
  try {
    const command = new ScanCommand({TableName: CALL_INTENTS_TABLE});
    const { Items } = await docClient.send(command);

    const data = Items.map(item => ({
      intent: item.intent?.S,
      call_id: item.call_id?.S,
      cluster_id: item.cluster_id?.S,
    }));

    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not get call intents" });
  }

}