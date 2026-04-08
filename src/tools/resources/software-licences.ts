/**
 * Software Licences - Software license tracking
 * Endpoint: /SoftwareLicence
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const softwareLicencesConfig: ResourceConfig = {
  name: "softwarelicences",
  apiPath: "/SoftwareLicence",
  description: "software licence",
  readPermission: "Agent, Assets Read",
  writePermission: "Agent, Assets Modify",
  listParams: {
    includedetails: z.boolean().optional().describe("Include extra details"),
  },
};
