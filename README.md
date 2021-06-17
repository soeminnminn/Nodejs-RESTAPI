# Node JS REST API

# Installation
Clone or download project from github.

# Config
Extend on knex config. see [Knexjs](https://knexjs.org/#Installation-node)

``` javascript
{
  "pagesize": 20,
  "maindb": "database1",
  "database": ["database1", "database2"],
  "modelBasePath": '/path/to/models/',
  "authHandler": function(req, res, next) {},
  "inputHandler": function(req, res, done) {},
  "resultHandler": function(result, req, res, done) {},
  "errorHandler": function(error, req, res, done) {};
}
```
### required

 see [Knexjs](https://knexjs.org/#Installation-node)

### optionals

 - *pagesize* (number) : Page size of record. Default is 20.

 - *maindb* (string) : What database is main access.

 - *database* (array) : What databases can access. Multipiles database supports.

 - *modelBasePath* (string) : Path of custom models folder.

 - *authHandler* (function) : Handle custom authentication.

 - *inputHandler* (function) : Customize body data handler.

 - *resultHandler* (function) : Output result custom handler.

 - *errorHandler* (function) : Error custom handler.


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
GET: http://localhost:3000/api/user/1
SQL: SELECT * FROM restapi.user WHERE id = 1

RESULT: {user: [JSON]}
```
```
GET: http://localhost:3000/api/user/1,2
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

## columns

With the "*columns*" parameter you can select specific columns.

```
GET: http://localhost:3000/api/user?columns=name,firstname,lastname
SQL: SELECT name, firstname, lastname FROM user

RESULT: {user: [JSON]}
```

### '@' sign for alias

```
GET: http://localhost:3000/api/user?columns=name,firstname@name,lastname@familyname
SQL: SELECT name, firstname AS name, lastname AS familyname FROM user

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
  - *knex*: Return the Knex object.
  - *getApi()*: Return the API object.
  - *getSettings()*: Return the API config settings object.
  - *getDb()*: Return the database connector object (KNEX).
  - *getRequest()*: Return the request object.
  - *getResponse()*: Return the response object.

**callback**
  Node result callback.

# Functions

## init
Initialize api library. 
Parameter : Config

## getDB
- paremeters
  - tablename {string} optional
- return 
  - KNEX object
Get current database connection object of KNEX instance.

## getKnex
Get current database connection object of KNEX instance.

## applyModel
- paremeters
  - name {string|object} Model name or model object.
Apply custom models to api.

## execute
- paremeters
  - name {string} Table name or model name
Execute call.

# TODO :

  - [ ] Relational Supports

# Refrences

 - [Knexjs](http://knexjs.org/) : SQL query builder for Postgres, MSSQL, MySQL, MariaDB, SQLite3, and Oracle.
 - [PHP-CRUD-API](https://github.com/mevdschee/php-crud-api/) : Single file PHP script that adds a REST API to a MySQL 5.5 InnoDB database. PostgreSQL 9.1, MS SQL Server 2012 and SQLite 3.
 - [jQuery REST Client](https://github.com/jpillora/jquery.rest/) : A jQuery plugin for easy consumption of RESTful APIs
