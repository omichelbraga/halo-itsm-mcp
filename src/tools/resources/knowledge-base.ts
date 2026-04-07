/**
 * Knowledge Base - KB Articles
 * Endpoint: /KBArticle
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const knowledgeBaseConfig: ResourceConfig = {
  name: "kb",
  apiPath: "/KBArticle",
  description: "knowledge base article",
  readPermission: "User, KB Read",
  writePermission: "Agent, KB Modify",
  listParams: {},
};
