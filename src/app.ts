/**
 * Main Application
 */
import * as express from "express";
import * as path from "path";
import { ExpressApplication } from "./lib/express-application";
import * as RestApi from "./restapi";

class MainApp extends ExpressApplication {
  constructor() {
    super(__dirname);

    // uncomment after under construction
    // this.isUnderConstruction = true;

    this.urlencodedOptions.extended = true;
  }

  public onUseViewEngine(app: express.Express): void {
    // view engine setup
  }

  public onUseMiddleWares(app: express.Express): void {
    this.useStatic("../public");

    const mysqlConfig = {
      client: "mysql",
      connection: {
        host: "127.0.0.1",
        user: "root",
        password: "sulfur",
        database: "burmabranded"
      },
      pagesize: 20
    };
    const sqliteConfig = {
      client: "sqlite3",
      connection: {
        filename: path.resolve(__dirname, "../data/db.sqlite")
      },
      pagesize: 20
    };

    this.use("/api", RestApi.init(sqliteConfig, (err, api) => {
      if (err) {
        console.log(err);
      }
    }));

    this.use("/", (req, res, next) => {
      res.send("It's works!");
    });
  }

  public onUseRouter(app: express.Express): void {
  }
}

const app = new MainApp();
export default app.create();