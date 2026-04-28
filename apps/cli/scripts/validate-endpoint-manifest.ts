import { loadEndpointManifestFromFile } from "../lib/endpoint-manifest";

const manifestPath = process.env.ENDPOINT_MANIFEST_PATH;
const manifest = loadEndpointManifestFromFile(manifestPath);

console.log(
  JSON.stringify(
    {
      status: "ok",
      endpointCaseCount: manifest.cases.length,
    },
    null,
    2,
  ),
);
