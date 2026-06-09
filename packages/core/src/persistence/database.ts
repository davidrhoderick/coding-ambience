import Database from "better-sqlite3";
import { schemaSql } from "./schema.js";

export type SemanticAgentDatabase = Database.Database;

export function createDatabase(path: string): SemanticAgentDatabase {
  const database = new Database(path);
  database.exec(schemaSql);
  return database;
}
