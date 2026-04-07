/**
 * Contracts - Service contracts
 * Endpoint: /ClientContract
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const contractsConfig: ResourceConfig = {
  name: "contracts",
  apiPath: "/ClientContract",
  description: "contract",
  readPermission: "User, Customers Read (list) / Agent, Customers Read (get)",
  writePermission: "Agent, Contracts Modify",
  listParams: {
    client_id: z.number().int().optional().describe("Filter by client ID"),
    count: z.number().int().optional().describe("Number of results"),
    includedetails: z.boolean().optional().describe("Include extra objects"),
  },
};
