const { MongoClient } = require("mongodb");
const { BSON } = require("bson");

test("inspect real client metadata under jest", async () => {
  const client = new MongoClient("mongodb://127.0.0.1:1/metadata_probe");
  const metadata = await client.options.metadata;
  console.log("METADATA TYPE:", metadata && metadata.constructor && metadata.constructor.name);
  console.log("METADATA KEYS:", metadata ? Object.keys(metadata) : null);
  console.log("METADATA DRIVER:", metadata && metadata.driver);
  console.log("METADATA STRING:", JSON.stringify(metadata));
  const bytes = BSON.serialize({ client: metadata });
  console.log("HANDSHAKE BYTES HEX:", bytes.toString("hex"));
  console.log("HANDSHAKE DESER:", JSON.stringify(BSON.deserialize(bytes)));
  expect(true).toBe(true);
});
