const fs = require("fs");
const path = require("path");
const { docClient } = require("../dynamoDB");
const { client: openSearchClient } = require('../openSearch');
const { v4: uuid } = require('uuid');
const { ScanCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { OpenAI } = require('openai');
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const CALL_INTENTS_TABLE = process.env.CALL_INTENTS_TABLE;

const INDEX_NAME = 'call-intents-index';

module.exports = async function clusterCallIntents() {
  try {
    // Get all the non-clustered items
    const command = new ScanCommand({
      TableName: CALL_INTENTS_TABLE,
      FilterExpression: "attribute_not_exists(cluster_id)",
    });

    // If all items are clustered, return
    const { Items } = await docClient.send(command);
    if (Items && Items.length <= 0) {
      return;
    }

    console.log(Items.length);

    const openai = new OpenAI(process.env.OPENAI_API_KEY);

    // Process 20 items at a time due to Lambda Timeout
    for (const item of Items.slice(0, 20)) {
      const intent = item['intent']['S'];
      const call_id = item['call_id']['S'];

      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: intent,
      });
      const { embedding } = embeddingRes.data?.[0];

      // Search for similar embeddings (KNN)
      const searchRes = await openSearchClient.search({
        index: INDEX_NAME,
        body: {
          size: 5,
          query: {
            knn: {
              vector_embeddings: {
                vector: embedding,
                k: 5,
              }
            }
          }
        }
      });

      const { hits } = searchRes.body.hits;

      // Find the cluster of the nearest Hit and Update the cluster_id for the item
      const nearestHits = hits.filter(hit => hit._score >= 0.6 && hit._source?.call_id !== call_id);
      console.log({ nearestHits });
      if (nearestHits.length <= 0) {
        console.log({ hits });
      }

      const cluster_id = nearestHits?.[0]?._source?.cluster_id || uuid();

      const putCommand = new PutCommand({
        TableName: CALL_INTENTS_TABLE,
        Item: {
          intent,
          call_id,
          cluster_id,
        }
      });
      await docClient.send(putCommand);

      // also add to the openSearch index
      await openSearchClient.index({
        index: INDEX_NAME,
        body: {
          vector_embeddings: embedding,
          call_id,
          cluster_id,
        }
      });
    }

  } catch (error) {
    console.error(error);
    throw new Error("Could not cluster call intents");
  }

}