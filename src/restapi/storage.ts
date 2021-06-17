/**
 * REST API Storage Class
 */
import * as pathModule from "path";
import { Utils } from "./utils";

export class Storage {
  public static COMMANDS: Array<string> = ["HEAD", "OPTIONS", "GET", "POST", "PUT", "DELETE", "PATCH"];

  public getParamsKeys = [
    "distinct", "filter", "where", "columns", "exclude", "include",
    "order", "page", "start", "length", "join", "group", "having",
    "relation"
  ];
  public postParamsKeys = ["filter", "where", "relation"];

  public mainDb: string;
  public settings: any = {
    pagesize: 20
  };
  private schema: any;
  private models: any;
  public modBasePath: string;
  private modPath: string;

  constructor(options: any, schema: any) {
    Utils.mixin(this.settings, options, true);
    this.mainDb = this.settings.maindb || "";
    this.schema = schema;
    this.models = {};
    if (options.modelBasePath) {
      this.setModelBasePath(options.modelBasePath);
    }
  }

  public setModelBasePath(path: string) {
    if (path) {
      const pathArr = path.split(pathModule.sep);
      const currentArr = __dirname.split(pathModule.sep);
      while (pathArr.length > 0) {
        if (pathArr[0] != currentArr[0])
          break;
        pathArr.shift();
        currentArr.shift();
      }
      this.modPath = "./" + "../".repeat(currentArr.length) + pathArr.join("/");
      this.modBasePath = path;
    }
  }

  public pushModel(mod: string | any) {
    if (typeof mod === "object" && mod.name) {
      if (mod.model) {
        this.models[mod.name] = mod.model;
      } else {
        this.pushModel(mod.name);
      }
    } else if (this.modPath && typeof mod === "string" && mod != "") {
      this.addModel(mod, require(`${this.modPath}/${mod}`));
    }
  }

  public addModel(modelName: string, model: any) {
    this.models[modelName] = model;
  }

  public isModel(modelName: string): boolean {
    if (this.models && typeof modelName === "string" && modelName != "string") {
      return (typeof this.models[modelName] !== "undefined");
    }
    return false;
  }

  public isModelFunction(name: string, modelName: string): boolean {
    const mod = this.getModel(modelName);
    if (mod && typeof name === "string" && name != "") {
      let fnName = name;
      const funcs = Utils.getAllUserFuncs(mod);
      const exp = new RegExp(`^${fnName}$`, "i");
      const index = funcs.findIndex((val) => exp.test(val));
      if (index > -1) {
        fnName = funcs[index];
      }
      const m = mod[fnName];
      return (m && typeof m === "function");
    }
    return false;
  }

  public getModel(modelName: string) {
    if (this.isModel(modelName)) {
      const mod = this.models[modelName];
      if (mod.default && typeof mod.default == "object") {
        return mod.default;
      }
      return mod;
    }
    return undefined;
  }

  public getSchema() {
    return this.schema;
  }

  public isMainDatabase(dbName: string): boolean {
    return dbName == this.mainDb;
  }

  public isDatabase(dbName: string): boolean {
    if (typeof this.schema !== "object") {
      throw new Error("Schema is empty");
    }
    return (this.schema && typeof dbName === "string" && dbName != "" && this.schema[dbName] && typeof this.schema[dbName] === "object");
  }

  public isTable(tableName: string, dbName: string = this.mainDb): boolean {
    if (this.isDatabase(dbName) && typeof this.schema[dbName] === "object" &&
      typeof tableName === "string" && tableName != "") {
      return (typeof this.schema[dbName][tableName] === "object");
    }
    return false;
  }

  public getDatabase(dbName: string): any {
    if (this.isDatabase(dbName)) {
      return this.schema[dbName];
    }
    return undefined;
  }

  public getTable(tableName: string, dbName: string = this.mainDb): any {
    if (this.isTable(tableName, dbName)) {
      return this.schema[dbName][tableName];
    }
    return undefined;
  }

  public getPrimaryKey(tableName: string, dbName: string = this.mainDb): any {
    const table = this.getTable(tableName, dbName);
    if (table && table.columns && table.columns.length > 0 && table.primary) {
      const index = (<any[]>table.columns).findIndex((col: any) => col.name == table.primary );
      if (index > -1) {
        return table.columns[index];
      }
    }
    return undefined;
  }

  public getColumns(tableName: string, dbName: string = this.mainDb): any[] {
    const table = this.getTable(tableName, dbName);
    if (table && table.columns && table.columns.length > 0) {
      return table.columns;
    }
    return undefined;
  }
}