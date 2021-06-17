/**
 * REST API Interfaces
 */
import * as http from "http";
import * as knex from "knex";
import { RestApi } from "./api";

export namespace IFaces {

  export interface ISchema {
    mssql: any;
    mysql: any;
    oracledb: any;
    pg: any;
    sqlite3: any;
  }

  export interface ISchemaQuery {
    readonly list_tables: string;
    readonly reflect_table: string;
    readonly reflect_pk: string;
    readonly reflect_columns: string;
    readonly reflect_belongs_to: string;
    readonly reflect_has_many: string;
    readonly reflect_habtm: string;
  }

  export interface ISchemaDatabase {
    name: string;
    tables: ISchemaTable[];
  }

  export interface ISchemaTable {
    name: string;
    comment?: string;
    primary?: string;
    columns?: ISchemaColumn[];
  }

  export interface ISchemaColumn {
    name: string;
    defaultValue?: any;
    nullable?: string; // [yes/no]
    dataType?: string;
    maxLength?: number;
    extra?: string;
  }

  export interface IDatabaseRenderable {
    Database: string;
    Tables?: ITableRenderable[];
  }

  export interface ITableRenderable {
    Table: string;
    Comment?: string;
    Columns?: IColumnRenderable[];
    Indexes?: IIndexRenderable[];
  }

  export interface IColumnRenderable {
    Field: string;
    Type?: string;
    Key?: string;
    Null?: string;
    Default?: any;
    Extra?: string;
    Comment?: string;
  }

  export interface IIndexRenderable {
    Key: string;
    Column?: string;
    Comment?: string;
  }

  export type DoneFunction = (result: any) => void;

  export interface ISettingsConfig extends knex.Config {
    pagesize?: number;
    allowedMethods?: string[];
    maindb?: string;
    databases?: string[];
    modelBasePath?: string;
    authHandler?: (req: http.IncomingMessage, res: http.ServerResponse, next: Function) => any;
    inputHandler?: (req: http.IncomingMessage, res: http.ServerResponse, done: DoneFunction) => any;
    resultHandler?: (result: any, req: http.IncomingMessage, res: http.ServerResponse, done: DoneFunction) => any;
    errorHandler?: (error: any, req: http.IncomingMessage, res: http.ServerResponse, done: DoneFunction) => any;
  }

  export interface IModel {
    name: string;
    model: any;
  }

  export interface IModelArgsHolder {
    api: RestApi;
    req: http.IncomingMessage;
    res: http.ServerResponse;
  }

  export interface IHandlerLayer {
    readonly regEx: RegExp;
    readonly method: string;
    readonly handler: Function;
  }
}