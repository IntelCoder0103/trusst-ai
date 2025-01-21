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
      // Limit: 5,
    });
    const { Items } = await docClient.send(command);
    if (Items && Items.length <= 0) {
      return res.json({ message: "All call intents are already clustered" });
    }

    console.log(Items.length);

    for (const item of Items.slice(0, 20)) {
      const openai = new OpenAI(process.env.OPENAI_API_KEY);
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

      // Update the cluster_id for the item
      const nearestHits = hits.filter(hit => hit._score >= 0.75);
      console.log({ nearestHits });
      const cluster_id = nearestHits?.[0]?._source?.cluster_id || uuid();
      console.log({ cluster_id });
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

    // await openSearchClient.index({
    //   index: INDEX_NAME,
    //   body: {
    //     vector_embeddings: embedding,
    //     call_id: item['call_id']['S'],
    //   }
    // });
    // Cluster the call intents

    // res.json({ message: "Call intents seeded successfully" });
  } catch (error) {
    console.error(error);
    throw new Error("Could not cluster call intents");
  }

}