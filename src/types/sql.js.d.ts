declare module "sql.js/dist/sql-asm.js" {
  import type { SqlJsStatic } from "sql.js";
  const initSqlJs: () => Promise<SqlJsStatic>;
  export default initSqlJs;
}
