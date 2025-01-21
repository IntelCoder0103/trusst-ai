const { Client } = require('@opensearch-project/opensearch');

const client = new Client({
  node: 'https://search-trusstai-3d2u3v6ktzotnzhmaj3bycumte.us-east-1.es.amazonaws.com', // Replace with your OpenSearch domain endpoint
});

module.exports = { client };