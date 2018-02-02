# Node JS REST API

# Config
``` javascript
{
  "driver": "mysql",
  "connection": {
    "host": "localhost",
    "user": "root",
    "password": "******",
    "database": "main database"
  },
  "pagesize": 20,
  "database": ["database1", "database2"],
  "inputTranform": function(req, params) {},
  "outputTranform": function(req, result) {},
  "bodyTranform": function(req, body, params) {},
  "modelBasePath": '/path/to/models/',
  "users": [ { "name": "user", "pass": "*****" } ],
  "secrets": [ "secret key" ];
  "isAuthorized": function(credentials) {}
}
```
### required

 - *driver* (mysql, mssql, postgresql, sqlite3, oracle) : What driver you will used.

 - *connection* : Config for database connection.

### optionals

 - *pagesize* (number) : Page size of record. Default is 20.

 - *database* (array) : What databases can access. Multipiles database supports.

 - *inputTranform* (function) : Input paramater custom parser.

 - *bodyTranform* (function) : Customize body data.

 - *outTranform* (function) : Output result custom parser.

 - *modelBasePath* (string) : Path of custom models folder.

 - *users* (Array|object) : Basic authentication users.

 - *secrets* (Array) : Csrf authentication secret keys.

 - *isAuthorized* (function) : Custom authentication method.


# URL Format

```
http://localhost:3000/api[/database]/table[/filters][?parameters]
http://localhost:3000/api[/database]/table[/table1[/table2[/...]]][?parameters]
```

### Examples

Table User:

Column | type
------------|----------
id | int
name | text
firstname | text
lastname | text
password | text

```
GET: http://localhost:3000/api/restapi/user/1
SQL: SELECT * FROM restapi.user WHERE id = 1

RESULT: {user: [JSON]}
```
```
GET: http://localhost:3000/api/restapi/user/1,2
SQL: SELECT * FROM restapi.user WHERE id IN (1,2)

RESULT: {user: [JSON]}
```

# Query Parameters

## filter

Selections parameter of query.
  - *cs*: contain string (string contains value)
  - *sw*: start with (string starts with value)
  - *ew*: end with (string end with value)
  - *eq*: equal (string or number matches exactly)
  - *lt*: lower than (number is lower than value)
  - *le*: lower or equal (number is lower than or equal to value)
  - *ge*: greater or equal (number is higher than or equal to value)
  - *gt*: greater than (number is higher than value)
  - *bt*: between (number is between two comma separated values)
  - *in*: in (number is in comma separated list of values)
  - *is*: is null (field contains "NULL" value)

```
GET: http://localhost:3000/api/user?filter=id,eq,1
SQL: SELECT * FROM user WHERE id = 1

RESULT: {user: [JSON]}
```
```
GET: http://localhost:3000/api/user?filter=id,in,[1,2]
SQL: SELECT * FROM user WHERE id IN (1, 2)

RESULT: {user: [JSON]}
```
```
GET: http://localhost:3000/api/user?filter=id,in,[1,2],or,name,sw,m
SQL: SELECT * FROM user WHERE id IN (1, 2) OR name LIKE 'm%'

RESULT: {user: [JSON]}
```

## where / w

Where condition of sql query (URL encoded).

```
GET: http://localhost:3000/api/user?where=id=1
SQL: SELECT * FROM user WHERE id = 1

RESULT: {user: [JSON]}
```
```
GET: http://localhost:3000/api/user?w=id=1
SQL: SELECT * FROM user WHERE id = 1

RESULT: {user: [JSON]}
```

## columns

With the "*columns*" parameter you can select specific columns.

```
GET: http://localhost:3000/api/user?columns=name,firstname,lastname
SQL: SELECT name, firstname, lastname FROM user

RESULT: {user: [JSON]}
```

## distinct

The SELECT DISTINCT statement is used to return only distinct (different) values.

```
GET: http://localhost:3000/api/user?distinct
SQL: SELECT DISTINCT * FROM user

RESULT: {user: [JSON]}
```

## exclude

Remove certain columns.

```
GET: http://localhost:3000/api/user?exclude=password
SQL: SELECT name, firstname, lastname FROM user

RESULT: {user: [JSON]}
```

## include

Include other tables.

```
GET: http://localhost:3000/api/user?include=city
SQL: SELECT * FROM user
SQL1: SELECT * FROM city

RESULT: {user: [JSON], city: [JSON]}
```

## order

With the "order" parameter you can sort. By default the sort is in ascending order, but by specifying "desc" this can be reversed:

```
GET: http://localhost:3000/api/user?order=name
SQL: SELECT * FROM user ORDER BY name

RESULT: {user: [JSON]}
```
```
GET: http://localhost:3000/api/user?order=name,desc
SQL: SELECT * FROM user ORDER BY name DESC

RESULT: {user: [JSON]}
```

## page

The "page" parameter holds the requested page. The default page size is 20.

```
GET: http://localhost:3000/api/user?page=0
SQL: SELECT * FROM user OFFSET 0 LIMIT 20

RESULT: {user: [JSON]}
```
```
GET: http://localhost:3000/api/user?page=0,50
SQL: SELECT * FROM user OFFSET 0 LIMIT 50

RESULT: {user: [JSON]}
```

## start

```
GET: http://localhost:3000/api/user?start=10
SQL: SELECT * FROM user OFFSET 10

RESULT: {user: [JSON]}
```

## length

```
GET: http://localhost:3000/api/user?length=50
SQL: SELECT * FROM user LIMIT 50

RESULT: {user: [JSON]}
```

## join

```
GET: http://localhost:3000/api/user?join=left,city,cityid,eq,city.id
SQL: SELECT * FROM user LEFT JOIN city ON cityid = city.id

RESULT: {user: [JSON]}
```

## group

```
GET: http://localhost:3000/api/user?group=type
SQL: SELECT * FROM user GROUP BY type

RESULT: {user: [JSON]}
```

## having

```
GET: http://localhost:3000/api/user?group=type&having=type,eq,user
SQL: SELECT * FROM user GROUP BY type HAVING type = 'user'

RESULT: {user: [JSON]}
```

# INSERT

```
POST: http://localhost:3000/api/user
BODY: { "name": "helloworld","firstname": "hello", "lastname": "world", "password": "******" }
SQL: INSERT INTO user (name, firstname, lastname, password) VALUES ('helloworld', 'hello', 'world', "******")

RESULT: {inserted id}
```

# UPDATE

```
PATCH: http://localhost:3000/api/user/1
BODY: { "name": "helloworld","firstname": "hello", "lastname": "world", "password": "******" }
SQL: UPDATE user SET name = 'helloworld', firstname = 'hello', lastname = 'world', password = '******' WHERE id = 1

RESULT: {number of affected rows}
```

# SAVE

```
PUT: http://localhost:3000/api/user
BODY: { "id": 1, "name": "helloworld","firstname": "hello", "lastname": "world", "password": "******" }
SQL: UPDATE user SET name = 'helloworld', firstname = 'hello', lastname = 'world', password = '******' WHERE id = 1

     [When UPDATE not success]
     INSERT INTO user (name, firstname, lastname, password) VALUES ('helloworld', 'hello', 'world', "******")

RESULT: {number of affected rows}
```

# DELETE

```
DELETE: http://localhost:3000/api/user/1
SQL: DELETE FROM user WHERE id = 1

RESULT: {number of affected rows}
```

# Models

Add custom model.

After call api.init(config).

Can apply a model by name only. If you add by name only, you must set 'modelBasePath' in config.
``` javascript
api.applyModel('modelName#1');
```

Can apply a model object:
``` javascript
api.applyModel('modelName#2', { model object });
```

Can apply a model object:
``` javascript
api.applyModel({ "name": "modelName#3", "model": { model object } });
```

Can apply many model objects:
``` javascript
api.applyModel(
  { "name": "modelName#4", "model": { model object } },
  { "name": "modelName#5", "model": { model object } },
  { "name": "modelName#6", "model": { model object } }
);
```

Can apply models as array:
``` javascript
api.applyModel([
  { "name": "modelName#7", "model": { model object } },
  { "name": "modelName#8", "model": { model object } },
  { "name": "modelName#9", "model": { model object } }
]);
```

## Model Arguments

**args**
  - *settings*: API config settings object.
  - *db*: Database connector object (KNEX).
  - *params*: URL and Query paremeters parsed object.
  - *req*: Request object.
  - *res*: Response object.
  - *next*: Next method.

**callback**
  Node result callback.

# Authentication

## basic authentication
You will apply 'users' in api config.

## Csrf authentication
Use csrf token in api. You will apply 'secrets' in api config. 'users' config also required.

### Csrf Secret generator
```
GET: /api/--gensecret
RESULT: { "secret": "secret key" }
```

### Csrf token generator
```
GET: /api/--gentoken?secret=******
RESULT: { "token": "token key" }
```

## custom authentication
You will apply 'isAuthorized' method in api config.

# Execute
Direct access executing.
``` javascript
var restapi = require('./../../lib/restapi');
  ...
restapi.execute(
  // Method [optional] (default: 'GET')
  'GET',
  // Object Name / Table name [required]
  'user',
  // Arguments
  {
    'data': {},
    'columns': [],
    'where': [],
    'join': '',
    'group': '',
    'having': '',
    'order': '',
    'start': 0,
    'length': 10
  },
  // Callback
  function(err, result) {

  }
);
```

# TODO :

  - [ ] Oracle filters

  - [ ] Relational Supports

# Refrences

 - [Knexjs](http://knexjs.org/) : SQL query builder for Postgres, MSSQL, MySQL, MariaDB, SQLite3, and Oracle.
 - [PHP-CRUD-API](https://github.com/mevdschee/php-crud-api/) : Single file PHP script that adds a REST API to a MySQL 5.5 InnoDB database. PostgreSQL 9.1, MS SQL Server 2012 and SQLite 3.
 - [jQuery REST Client](https://github.com/jpillora/jquery.rest/) : A jQuery plugin for easy consumption of RESTful APIs
