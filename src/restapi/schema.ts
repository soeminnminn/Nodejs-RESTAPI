/**
 * REST API Schema Base
 */
import * as knex from "knex";
import { IFaces } from "./interfaces";

/*
{
  database1: {
    table1: {
      name: string,
      comment: string,
      primary: string,
      columns: [{
        name: string,
        defaultValue: any,
        nullable: "yes/no",
        dataType: string,
        maxLength: number,
        extra: string
      }, { ... }]
    },
    table2: { }
  }
}
*/

/**
 * DbSchema Class
 */
export class DbSchema {
  db: knex;
  queries: IFaces.ISchemaQuery;

  constructor(db: knex) {
    this.db = db;
  }

  public getSchemas(databases: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const funcs: Promise<any>[] = [];
      for (const name of databases) {
        funcs.push(this.getDbSchema(name));
      }

      Promise.all(funcs)
        .then((result) => {
          const data: any = {};
          for (const dbObj of result) {
            const dbName = dbObj.name;
            data[dbName] = {};
            for (const tableObj of dbObj.tables) {
              const tblName = tableObj.name;
              data[dbName][tblName] = tableObj;
            }
          }
          resolve(data);
        }).catch((err) => {
          reject(err);
        });
    });
  }

  protected getDbSchema(dbName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const data: any = {
        name: dbName,
        tables: []
      };
      this.execQuery(this.queries.list_tables, [dbName])
        .then((result) => {
          const funcs: Promise<any>[] = [];
          for (const table of result[0]) {
            funcs.push(this.getTableSchema(dbName, table));
          }
          return Promise.all(funcs);
        })
        .then((result) => {
          data.tables = result;
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  protected getTableSchema(database: string, table: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const tableObj: IFaces.ISchemaTable = {
        name: "",
        comment: "",
        primary: "",
        columns: []
      };
      if (typeof table === "string") {
        tableObj.name = table;
      } else if (typeof table === "object") {
        this.extractTable(table, tableObj);
      }
      this.execQuery(this.queries.reflect_pk, [tableObj.name, database])
        .then((result) => {
          if (result.length > 0 && result[0].length > 0) {
            const colObj = this.extractColunm(result[0][0]);
            tableObj.primary = colObj.name;
          }
          return this.execQuery(this.queries.reflect_columns, [tableObj.name, database]);
        })
        .then((result) => {
          for (const col of result[0]) {
            const colObj = this.extractColunm(col);
            tableObj.columns.push(colObj);
          }
          resolve(tableObj);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  extractTable(tableObj: any, result: IFaces.ISchemaTable): IFaces.ISchemaTable {
    result.name = tableObj["TABLE_NAME"];
    result.comment = tableObj["TABLE_COMMENT"];
    return result;
  }

  extractColunm(columnObj: any, result?: IFaces.ISchemaColumn): IFaces.ISchemaColumn {
    result = {
      name: columnObj["COLUMN_NAME"],
      defaultValue: columnObj["COLUMN_DEFAULT"] || undefined,
      nullable: columnObj["IS_NULLABLE"] || "yes",
      dataType: columnObj["DATA_TYPE"] || undefined,
      maxLength: columnObj["CHARACTER_MAXIMUM_LENGTH"] || undefined,
      extra: columnObj["EXTRA"] || ""
    };
    return result;
  }

  protected execQuery(query: string, args?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error("DB is null."));
      }
      this.db.raw(query, args)
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}

/**
 * Microsoft SQL Schema Class
 * @param {knex} db Database Query Object
 * @param {string|array} databases Database name array
 */
export class MsSQL extends DbSchema {
  constructor(db: knex) {
    super(db);
    this.queries = {
      list_tables: "SELECT [TABLE_NAME], '' AS [TABLE_COMMENT] \
        FROM [INFORMATION_SCHEMA].[TABLES] WHERE [TABLE_CATALOG] = ?",

      reflect_table: "SELECT [TABLE_NAME] FROM [INFORMATION_SCHEMA].[TABLES] \
        WHERE  [TABLE_NAME] = ? AND  [TABLE_CATALOG] = ?",

      reflect_pk: "SELECT [COLUMN_NAME] \
        FROM [INFORMATION_SCHEMA].[TABLE_CONSTRAINTS] tc, [INFORMATION_SCHEMA].[KEY_COLUMN_USAGE] ku \
        WHERE tc.[CONSTRAINT_TYPE] = 'PRIMARY KEY' AND \
          tc.[CONSTRAINT_NAME] = ku.[CONSTRAINT_NAME] AND \
          ku.[TABLE_NAME] = ? AND ku.[TABLE_CATALOG] = ?",

      reflect_columns: "SELECT [COLUMN_NAME], [COLUMN_DEFAULT], [IS_NULLABLE], [DATA_TYPE], [CHARACTER_MAXIMUM_LENGTH], \
        CASE COLUMNPROPERTY(object_id(TABLE_NAME), COLUMN_NAME, 'IsIdentity') WHEN 1 THEN 'IsIdentity' ELSE '' END AS [EXTRA] \
        FROM [INFORMATION_SCHEMA].[COLUMNS] \
        WHERE [TABLE_NAME] LIKE ? AND [TABLE_CATALOG] = ? \
        ORDER BY [ORDINAL_POSITION]",

      reflect_belongs_to: "SELECT cu1.[TABLE_NAME], cu1.[COLUMN_NAME], cu2.[TABLE_NAME],cu2.[COLUMN_NAME] \
        FROM [INFORMATION_SCHEMA].REFERENTIAL_CONSTRAINTS rc, \
          [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cu1, [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cu2 \
        WHERE cu1.[CONSTRAINT_NAME] = rc.[CONSTRAINT_NAME] AND \
          cu2.[CONSTRAINT_NAME] = rc.[UNIQUE_CONSTRAINT_NAME] AND cu1.[TABLE_NAME] = ? AND \
          cu2.[TABLE_NAME] IN ? AND cu1.[TABLE_CATALOG] = ? AND cu2.[TABLE_CATALOG] = ?",

      reflect_has_many: "SELECT cu1.[TABLE_NAME],cu1.[COLUMN_NAME], cu2.[TABLE_NAME],cu2.[COLUMN_NAME] \
        FROM [INFORMATION_SCHEMA].REFERENTIAL_CONSTRAINTS rc, \
          [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cu1, [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cu2 \
        WHERE cu1.[CONSTRAINT_NAME] = rc.[CONSTRAINT_NAME] AND \
          cu2.[CONSTRAINT_NAME] = rc.[UNIQUE_CONSTRAINT_NAME] AND cu1.[TABLE_NAME] IN ? AND \
          cu2.[TABLE_NAME] = ? AND cu1.[TABLE_CATALOG] = ? AND cu2.[TABLE_CATALOG] = ?",

      reflect_habtm: "SELECT cua1.[TABLE_NAME],cua1.[COLUMN_NAME], cua2.[TABLE_NAME],cua2.[COLUMN_NAME], \
          cub1.[TABLE_NAME],cub1.[COLUMN_NAME], cub2.[TABLE_NAME],cub2.[COLUMN_NAME] \
        FROM [INFORMATION_SCHEMA].REFERENTIAL_CONSTRAINTS rca, [INFORMATION_SCHEMA].REFERENTIAL_CONSTRAINTS rcb, \
          [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cua1, [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cua2, \
          [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cub1, [INFORMATION_SCHEMA].CONSTRAINT_COLUMN_USAGE cub2  \
        WHERE cua1.[CONSTRAINT_NAME] = rca.[CONSTRAINT_NAME] AND cua2.[CONSTRAINT_NAME] = rca.[UNIQUE_CONSTRAINT_NAME] AND \
          cub1.[CONSTRAINT_NAME] = rcb.[CONSTRAINT_NAME] AND cub2.[CONSTRAINT_NAME] = rcb.[UNIQUE_CONSTRAINT_NAME] AND \
          cua1.[TABLE_CATALOG] = ? AND cub1.[TABLE_CATALOG] = ? AND cua2.[TABLE_CATALOG] = ? AND \
          cub2.[TABLE_CATALOG] = ? AND cua1.[TABLE_NAME] = cub1.[TABLE_NAME] AND cua2.[TABLE_NAME] = ? AND cub2.[TABLE_NAME] IN ?"
    };
  }
}

/**
 * MySql Schema Class
 * @param {knex} db Database Query Object
 */
export class MySQL extends DbSchema {
  constructor(db: knex) {
    super(db);
    this.queries = {
      list_tables: "SELECT `TABLE_NAME`,`TABLE_COMMENT` FROM `INFORMATION_SCHEMA`.`TABLES` \
        WHERE `TABLE_SCHEMA` = ?",

      reflect_table: "SELECT `TABLE_NAME` FROM `INFORMATION_SCHEMA`.`TABLES` \
        WHERE `TABLE_NAME` COLLATE 'utf8_bin' = ? AND `TABLE_SCHEMA` = ?",

      reflect_pk: "SELECT `COLUMN_NAME` \
        FROM `INFORMATION_SCHEMA`.`COLUMNS` WHERE `COLUMN_KEY` = 'PRI' AND `TABLE_NAME` = ? AND `TABLE_SCHEMA` = ?",

      reflect_columns: "SELECT `COLUMN_NAME`, `COLUMN_DEFAULT`, `IS_NULLABLE`, `DATA_TYPE`, `CHARACTER_MAXIMUM_LENGTH`, `EXTRA` \
        FROM `INFORMATION_SCHEMA`.`COLUMNS` WHERE `TABLE_NAME` = ? AND `TABLE_SCHEMA` = ? ORDER BY `ORDINAL_POSITION`",

      reflect_belongs_to: "SELECT `TABLE_NAME`,`COLUMN_NAME`, `REFERENCED_TABLE_NAME`,`REFERENCED_COLUMN_NAME` \
        FROM `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` \
        WHERE `TABLE_NAME` COLLATE 'utf8_bin' = ? AND `REFERENCED_TABLE_NAME` COLLATE 'utf8_bin' IN ? \
        AND `TABLE_SCHEMA` = ? AND `REFERENCED_TABLE_SCHEMA` = ?",

      reflect_has_many: "SELECT `TABLE_NAME`,`COLUMN_NAME`, `REFERENCED_TABLE_NAME`,`REFERENCED_COLUMN_NAME` \
        FROM `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` \
        WHERE `TABLE_NAME` COLLATE 'utf8_bin' IN ? AND `REFERENCED_TABLE_NAME` COLLATE 'utf8_bin' = ? \
        AND `TABLE_SCHEMA` = ? AND `REFERENCED_TABLE_SCHEMA` = ?",

      reflect_habtm: "SELECT k1.`TABLE_NAME`, k1.`COLUMN_NAME`, k1.`REFERENCED_TABLE_NAME`, k1.`REFERENCED_COLUMN_NAME`, \
        k2.`TABLE_NAME`, k2.`COLUMN_NAME`, k2.`REFERENCED_TABLE_NAME`, k2.`REFERENCED_COLUMN_NAME` \
        FROM `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` k1, `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` k2 \
        WHERE k1.`TABLE_SCHEMA` = ? AND k2.`TABLE_SCHEMA` = ? AND k1.`REFERENCED_TABLE_SCHEMA` = ? \
        AND k2.`REFERENCED_TABLE_SCHEMA` = ? AND k1.`TABLE_NAME` COLLATE 'utf8_bin' = k2.`TABLE_NAME` COLLATE 'utf8_bin' \
        AND k1.`REFERENCED_TABLE_NAME` COLLATE 'utf8_bin' = ? AND k2.`REFERENCED_TABLE_NAME` COLLATE 'utf8_bin' IN ?"
    };
  }
}

/**
 * Oracle Schema Class
 * @param {knex} db Database Query Object
 */
export class Oracle extends DbSchema {
  constructor(db: knex) {
    super(db);
    this.queries = {
      // https://docs.oracle.com/cd/B19306_01/server.102/b14237/statviews_2105.htm
      list_tables: "SELECT TABLE_NAME, '' AS TABLE_COMMENT FROM USER_TABLES WHERE OWNER = ?",

      reflect_table: "SELECT TABLE_NAME FROM USER_TABLES WHERE OWNER = ?",

      // https://docs.oracle.com/cd/B19306_01/server.102/b14237/statviews_1037.htm
      reflect_pk: "SELECT CONSTRAINT_NAME AS COLUMN_NAME FROM USER_CONSTRAINTS \
        WHERE CONSTRAINT_TYPE = 'P' AND TABLE_NAME = ? AND OWNER = ?",

      // https://docs.oracle.com/cd/B19306_01/server.102/b14237/statviews_2094.htm
      reflect_columns: "SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE, DATA_DEFAULT, CHAR_LENGTH \
        FROM USER_TAB_COLUMNS WHERE TABLE_NAME = ? AND OWNER = ? ORDER BY COLUMN_ID",

      reflect_belongs_to: "",

      reflect_has_many: "",

      reflect_habtm: ""
    };
  }

  extractColunm(columnObj: any, result?: IFaces.ISchemaColumn): IFaces.ISchemaColumn {
    result = {
      name: columnObj["COLUMN_NAME"]
    };
    result.defaultValue = columnObj["DATA_DEFAULT"] || undefined;
    result.nullable = columnObj["NULLABLE"] || "yes";
    result.dataType = columnObj["DATA_TYPE"] || undefined;
    result.maxLength = columnObj["DATA_LENGTH"] || undefined;
    if (columnObj["CHAR_LENGTH"]) {
      result.extra = `CharLen=${columnObj["CHAR_LENGTH"]}`;
    } else {
      result.extra = "";
    }
    return result;
  }
}

/**
 * PostgresSQL Schema Class
 * @param {knex} db Database Query Object
 */
export class PostgresSQL extends DbSchema {
  constructor(db: knex) {
    super(db);
    this.queries = {
      list_tables: "select \"table_name\",\'\' as \"table_comment\" from \"information_schema\".\"tables\" \
        where \"table_schema\" = \'public\' and \"table_catalog\" = ?",

      reflect_table: "select \"table_name\" from \"information_schema\".\"tables\" \
        where \"table_name\" = ? and \"table_schema\" = \'public\' and \"table_catalog\" = ?",

      reflect_pk: "select \"column_name\" from \"information_schema\".\"table_constraints\" tc, \"information_schema\".\"key_column_usage\" ku \
        where tc.\"constraint_type\" = \'PRIMARY KEY\' and tc.\"constraint_name\" = ku.\"constraint_name\" and \
          ku.\"table_name\" = ? and ku.\"table_schema\" = \'public\' and ku.\"table_catalog\" = ?",

      reflect_columns: "select \"column_name\", \"column_default\", \"is_nullable\", \"data_type\", \"character_maximum_length\", \'\' as \"extra\" \
        from  \"information_schema\".\"columns\"  \
        where \"table_name\" = ? and \"table_schema\" = \'public\' and \"table_catalog\" = ? \
        order by \"ordinal_position\"",

      reflect_belongs_to: "select cu1.\"table_name\",cu1.\"column_name\", cu2.\"table_name\",cu2.\"column_name\" \
        from \"information_schema\".referential_constraints rc, \"information_schema\".key_column_usage cu1, \
        \"information_schema\".key_column_usage cu2 \
        where cu1.\"constraint_name\" = rc.\"constraint_name\" and cu2.\"constraint_name\" = rc.\"unique_constraint_name\" and \
          cu1.\"table_name\" = ? and cu2.\"table_name\" in ? and cu1.\"table_schema\" = \'public\' and \
          cu2.\"table_schema\" = \'public\' and cu1.\"table_catalog\" = ? and cu2.\"table_catalog\" = ?",

      reflect_has_many: "select cu1.\"table_name\",cu1.\"column_name\", cu2.\"table_name\",cu2.\"column_name\" \
        from \"information_schema\".referential_constraints rc, \"information_schema\".key_column_usage cu1, \
        \"information_schema\".key_column_usage cu2 \
        where cu1.\"constraint_name\" = rc.\"constraint_name\" and cu2.\"constraint_name\" = rc.\"unique_constraint_name\" and \
          cu1.\"table_name\" in ? and cu2.\"table_name\" = ? and cu1.\"table_schema\" = \'public\' and \
          cu2.\"table_schema\" = \'public\' and cu1.\"table_catalog\" = ? and cu2.\"table_catalog\" = ?",

      reflect_habtm: "select cua1.\"table_name\",cua1.\"column_name\", cua2.\"table_name\",cua2.\"column_name\", \
          cub1.\"table_name\",cub1.\"column_name\", cub2.\"table_name\",cub2.\"column_name\" \
        from \"information_schema\".referential_constraints rca, \"information_schema\".referential_constraints rcb, \
          \"information_schema\".key_column_usage cua1, \"information_schema\".key_column_usage cua2, \
          \"information_schema\".key_column_usage cub1, \"information_schema\".key_column_usage cub2 \
        where cua1.\"constraint_name\" = rca.\"constraint_name\" and cua2.\"constraint_name\" = rca.\"unique_constraint_name\" and \
          cub1.\"constraint_name\" = rcb.\"constraint_name\" and cub2.\"constraint_name\" = rcb.\"unique_constraint_name\" and \
          cua1.\"table_catalog\" = ? and cub1.\"table_catalog\" = ? and cua2.\"table_catalog\" = ? and cub2.\"table_catalog\" = ? and \
          cua1.\"table_schema\" = \'public\' and cub1.\"table_schema\" = \'public\' and cua2.\"table_schema\" = \'public\' and \
          cub2.\"table_schema\" = \'public\' and cua1.\"table_name\" = cub1.\"table_name\" and cua2.\"table_name\" = ? and cub2.\"table_name\" in ?"
    };
  }

  extractTable(tableObj: any, result: IFaces.ISchemaTable): IFaces.ISchemaTable {
    result.name = tableObj["table_name"];
    result.comment = tableObj["table_comment"];
    return result;
  }

  extractColunm(columnObj: any, result?: IFaces.ISchemaColumn): IFaces.ISchemaColumn {
    result = {
      name: columnObj["column_name"]
    };
    result.defaultValue = columnObj["column_default"] || undefined;
    result.nullable = columnObj["is_nullable"] || "yes";
    result.dataType = columnObj["data_type"] || undefined;
    result.maxLength = columnObj["character_maximum_length"] || undefined;
    result.extra = columnObj["extra"] || "";
    return result;
  }
}

/**
 * SQLite3 Schema Class
 * @param {knex} db Database Query Object
 */
export class SQLite3 extends DbSchema {
  constructor(db: knex) {
    super(db);
    this.queries = {
      list_tables: "SELECT `name`, '' AS `comment` FROM `sqlite_master` WHERE (type='table' or type = 'view') and name<>'sqlite_sequence'",

      reflect_table: "SELECT `name` FROM `sqlite_master` WHERE `name`=?",

      reflect_pk: "PRAGMA foreign_key_list(?)",

      reflect_columns: "PRAGMA table_info(?)",

      reflect_belongs_to: "",

      reflect_has_many: "",

      reflect_habtm: ""
    };
  }

  public getSchemas(databases: string[]): Promise<any> {
    const mainDb = (databases && databases.length > 0) ? databases[0] : "sqlite";
    return new Promise((resolve, reject) => {
      this.getDbSchema(mainDb)
        .then((result) => {
          const data: any = {};
          const dbName = result.name;
          data[dbName] = {};
          for (const tableObj of result.tables) {
            const tblName = tableObj.name;
            data[dbName][tblName] = tableObj;
          }
          resolve(data);
        }).catch((err) => {
          reject(err);
        });
    });
  }

  protected getDbSchema(dbName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const data: any = {
        name: dbName,
        tables: []
      };
      this.execQuery(this.queries.list_tables)
        .then((result) => {
          const funcs: Promise<any>[] = [];
          for (const table of result) {
            funcs.push(this.getTableSchema(dbName, table));
          }
          return Promise.all(funcs);
        })
        .then((result) => {
          data.tables = result;
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  protected getTableSchema(database: string, table: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const tableObj: IFaces.ISchemaTable = {
        name: "",
        comment: "",
        primary: "",
        columns: []
      };
      if (typeof table === "string") {
        tableObj.name = table;
      } else if (typeof table === "object") {
        this.extractTable(table, tableObj);
      }
      this.execQuery(this.queries.reflect_columns.replace("?", `'${tableObj.name}'`))
        .then((result) => {
          for (const col of result) {
            const colObj = this.extractColunm(col);
            if (col.pk == "1") {
              tableObj.primary = colObj.name;
            }
            tableObj.columns.push(colObj);
          }
          resolve(tableObj);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  extractTable(tableObj: any, result: IFaces.ISchemaTable): IFaces.ISchemaTable {
    result.name = tableObj["name"];
    result.comment = tableObj["comment"];
    return result;
  }

  extractColunm(columnObj: any, result?: IFaces.ISchemaColumn): IFaces.ISchemaColumn {
    result = {
      name: columnObj["name"]
    };
    result.defaultValue = columnObj["dflt_value"] || undefined;
    result.nullable = columnObj["notnull"] ? "no" : "yes";
    result.dataType = columnObj["type"] || undefined;
    result.maxLength = undefined;
    result.extra = "";
    return result;
  }
}

const schema: any = {};
schema.mssql = MsSQL;
schema.mysql = MySQL;
schema.oracledb = Oracle;
schema.pg = PostgresSQL;
schema.sqlite3 = SQLite3;

export default schema;