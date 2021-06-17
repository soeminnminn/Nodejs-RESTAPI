/**
 * REST API DataView class
 */
import { Utils } from "./utils";
import { Filters } from "./filters";

export class DataView {
  public dbName: string;
  public tableName: string;
  public type: string = "foreign";
  public primaryKey: any;
  public filter: any = {};
  public filterIds: string[];
  public columns: Array<any>;
  public distinct: boolean = false;
  public groupBy: Array<string>;
  public having: string;
  public orderBy: string;
  public offset: number;
  public limit: number;
  public values: any;
  public joins: any;
  public includes: any;
  private schemaColumns: any[];

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  private isColumnContains(col: string, arr: string[] = undefined) {
    if (Utils.isEmpty(col)) col = "";
    if (arr && arr.length > 0) {
      const tcol = `${this.tableName}.${col}`;
      return !!~arr.indexOf(col) || !!~arr.indexOf(tcol);
    }
    const index = this.schemaColumns.findIndex((sc) => { return sc.name == col; });
    return index > -1;
  }

  public get where() {
    const where: string[] = [];
    if (this.filter["primary"]) {
      where.push(this.filter["primary"]);
    }
    if (this.filter["filter"]) {
      for (const w of this.filter["filter"]) {
        where.push(w);
      }
    }
    if (where.length == 0) {
      return undefined;
    }
    return "(" + where.join(") AND (") + ")";
  }

  public setValues(values: any): DataView {
    this.values = values;
    return this;
  }

  public setTable(tableName: string, columns: any[]): DataView {
    this.tableName = tableName;
    this.schemaColumns = columns;
    return this;
  }

  public setPrimaryKey(primaryKey: any) {
    this.primaryKey = primaryKey;
  }

  public setUserColumns(userColumns: any): DataView {
    this.columns = [];
    const userCols: string[] = [];
    const userColsVals: string[] = [];
    if (userColumns && !Array.isArray(userColumns)) {
      userColumns = Utils.toArray(userColumns, ",");
    }

    for (const i in userColumns) {
      const col = `${userColumns[i]}`.replace(/^([^\s\(\)\,]+|)\((.*)\)/, (m, m1, m2) => {
        userColsVals.push(m2);
        return `${m1}(#${(userColsVals.length - 1)})`;
      });

      const colObj: any = {
        table: "",
        prefix: "",
        func: "",
        column: ""
      };

      if (!!~col.indexOf("@")) {
        const m = /^([^@]+)@([^@]+)$/.exec(col);
        if (m) {
          colObj.prefix = m[2];
          colObj.column = m[1];
        }
      } else if (!~col.indexOf("(") && !~col.indexOf(")") && !~col.indexOf(".")) {
        if (this.isColumnContains(col)) {
          colObj.table = this.tableName;
        }
        colObj.column = col;
      } else {
        const m = /^([^\(\)\.]+)\.([^\(\)\.]+)$/.exec(col);
        if (m) {
          colObj.table = m[1];
          colObj.column = m[2];
        } else {
          colObj.column = col;
        }
      }

      const mFunc = /^([^\s\(\)\,]+|)\(#([0-9]+)\)/.exec(col);
      if (mFunc) {
        colObj.column = `${userColsVals[parseInt(mFunc[2])]}`;
        colObj.func = `${mFunc[1]}` == "" ? "raw" : mFunc[1].toLowerCase();
      }

      this.columns.push(colObj);
    }
    return this;
  }

  public setExclude(exclude: any): DataView {
    if (!Array.isArray(exclude)) {
      exclude = Utils.toArray(exclude, ",");
    }
    this.columns = [];
    const excludeArr: string[] = [];
    for (const i in exclude) {
      if (exclude[i] != "") {
        excludeArr.push(exclude[i]);
      }
    }
    if (excludeArr.length > 0) {
      for (const col of this.schemaColumns) {
        if (!this.isColumnContains(col.name, excludeArr)) {
          this.columns.push(col);
        }
      }
    }
    return this;
  }

  public setIdFilters(filterStr: string, values: string[], filters?: Filters): DataView {
    if (filters) {
      this.filter["primary"] = filters.convertFilter(filterStr);
    } else {
      this.filter["primary"] = filterStr;
    }
    this.filterIds = values;
    return this;
  }

  public addFilter(filter: string|string[], filters?: Filters): DataView {
    if (!this.filter["filter"]) {
      this.filter["filter"] = [];
    }
    if (!Array.isArray(filter)) {
      filter = [filter];
    }
    for (const i in filter) {
      if (filters) {
        this.filter["filter"].push(filters.convertFilter(filter[i]));
      } else {
        this.filter["filter"].push(filter[i]);
      }
    }
    return this;
  }

  public setOrderBy(orderBy: any): DataView {
    if (!Array.isArray(orderBy)) {
      orderBy = [orderBy];
    }
    let sort = "ASC";
    for (const i in orderBy) {
      const arr = Utils.split(orderBy[i], ",");
      if (arr.length == 1) {
        arr.push(sort);
      }
      sort = arr[1] = arr[1].toUpperCase();
      orderBy[i] = arr.join(" ");
    }
    this.orderBy = orderBy.join(", ");
    return this;
  }

  public setOffset(offset: any): DataView {
    this.offset = Utils.tryParseInt(offset, 0);
    return this;
  }

  public setLength(length: any): DataView {
    this.limit = Utils.tryParseInt(length, 0);
    return this;
  }

  public setPage(page: any, defPageSize: number): DataView {
    if (typeof page === "number") {
      this.offset = page * defPageSize;
      this.limit = defPageSize;
    } else if (typeof page === "string") {
      page = page.replace(/[^0-9,]/g, "");
      let match = page.match(/^([0-9]+),([0-9]+)$/i);
      if (match) {
        this.limit = Utils.tryParseInt(match[2], 0);
        this.offset = Utils.tryParseInt(match[1], 0) * this.limit;
      } else {
        match = page.match(/^([0-9]+)$/i);
        if (match) {
          this.offset = Utils.tryParseInt(match[1], 0) * defPageSize;
          this.limit = defPageSize;
        }
      }
    }
    return this;
  }

  public setGroupBy(groupBy: any): DataView {
    const values = Utils.toArray(groupBy, ",");
    this.groupBy = [];
    for (const group of values) {
      this.groupBy.push(`${group}`);
    }
    return this;
  }

  public setHaving(having: any, filters?: Filters): DataView {
    const value = `${having}`.replace(/\"/g, "'");
    if (filters) {
      this.having = filters.convertFilter(value);
    } else {
      this.having = value;
    }
    return this;
  }

  public setJoin(join: any, filters?: Filters): DataView {
    let val = "";
    if (typeof join === "string") {
      val = join.replace(/\"/g, "'");
    } else {
      val = join;
    }
    this.joins = [];
    const list = Utils.toArray(val);
    for (const item of list) {
      const st = Utils.split(`${item}`, ",");
      if (st.length > 1) {
        let jType = "inner";
        if (!!~["inner", "left", "leftouter", "right", "rightouter", "outer", "fullouter", "cross"]
            .indexOf(st[0].toLowerCase())) {

          jType = st.shift().toLowerCase();
          if (jType == "leftouter") {
            jType = "left outer";
          } else if (jType == "rightouter") {
            jType = "right outer";
          } else if (jType == "fullouter") {
            jType = "full outer";
          }
        }
        jType += " join";

        const table = st.shift();
        if (table) {
          let cond = st.join(",");
          if (filters) {
            cond = filters.convertFilter(st.join(","));
          }
          this.joins.push({
            "type": jType,
            "table": table,
            "condition": cond
          });
        }
      }
    }
    return this;
  }

  public setInclude(include: any): DataView {
    let val = "";
    if (typeof include === "string") {
      val = include.replace(/\"/g, "'");
    } else {
      val = include;
    }
    this.includes = [];
    const list = Utils.toArray(val);
    for (const item of list) {
      const st = Utils.split(`${item}`, ",");
      if (st.length > 1) {
        const table = st.shift();
        if (table) {
          const column = st.shift();

          let related: string;
          if (st.length > 0) {
            related = st.shift();
          } else {
            related = this.primaryKey;
          }

          this.includes.push({
            "table": table,
            "column": column,
            "related": related
          });
        }
      }
    }
    return this;
  }
}