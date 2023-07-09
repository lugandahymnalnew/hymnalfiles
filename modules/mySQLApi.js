const mysql = require('mysql');
const con = require('./../config.json');
/**
 * @typedef {Object} Record
 * @property {string} name - The name of the record.
 * @property {number} age - The age of the record.
 */

/**
 * @typedef {Object} QueryResult
 * @property {any} results - The query results.
 * @property {Error} error - The error, if any.
 */

/** @type {mysql.Pool} */
const pool = mysql.createPool({
  host: con.mySQL.host,
  user: con.mySQL.user,
  password: con.mySQL.password,
  database: con.mySQL.database,
  port: 3306
});

/**
 * Executes a query with the provided parameters.
 * @param {string} query - The SQL query to execute.
 * @param {any[]} params - The parameters for the query.
 * @returns {Promise<QueryResult>} A promise that resolves with the query results or rejects with an error.
 */
function executeQuery(query, params) {
  return new Promise((resolve, reject) => {
    pool.query(query, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve({ results, error: null });
      }
    });
  });
}

/**
 * Creates a new table with the given name and columns.
 * @param {string} tableName - The name of the table to create.
 * @param {Object[]} columns - An array of objects representing the columns of the table.
 * @param {string} columns[].name - The name of the column.
 * @param {string} columns[].type - The data type of the column.
 * @returns {Promise<QueryResult>} A promise that resolves when the table is created or rejects with an error.
 */
function createTable(tableName, columns) {
  const columnDefinitions = columns.map((column) => `${column.name} ${column.type}`).join(',');
  const query = `CREATE TABLE ${tableName} (${columnDefinitions})`;
  return executeQuery(query, []);
}

/**
 * Drops a table with the given name.
 * @param {string} tableName - The name of the table to drop.
 * @returns {Promise<QueryResult>} A promise that resolves when the table is dropped or rejects with an error.
 */
function dropTable(tableName) {
  const query = `DROP TABLE ${tableName}`;
  return executeQuery(query, []);
}

/**
 * Creates a new record in the specified table.
 * @param {string} tableName - The name of the table to insert the record into.
 * @param {Record} record - The record to create.
 * @returns {Promise<QueryResult>} A promise that resolves when the record is created or rejects with an error.
 */
function createRecord(tableName, record) {
  const query = `INSERT INTO ${tableName} SET ?`;
  return executeQuery(query, record);
}

/**
 * Reads all records from the specified table.
 * @param {string} tableName - The name of the table to read records from.
 * @returns {Promise<QueryResult>} A promise that resolves with the retrieved records or rejects with an error.
 */
function readAllRecords(tableName) {
  const query = `SELECT * FROM ${tableName}`;
  return executeQuery(query, []);
}

/**
 * Reads a specific record by the specified field and value in the given table.
 * @param {string} tableName - The name of the table to read the record from.
 * @param {string} field - The field to query by.
 * @param {any} value - The value to match in the specified field.
 * @returns {Promise<QueryResult>} A promise that resolves with the retrieved record or rejects with an error.
 */
function readRecordByField(tableName, field, value) {
  const query = `SELECT * FROM ${tableName} WHERE ${field} = ?`;
  return executeQuery(query, [value]);
}

/**
 * Updates a record in the specified table by the specified field and value.
 * @param {string} tableName - The name of the table to update the record in.
 * @param {string} field - The field to query by.
 * @param {any} value - The value to match in the specified field.
 * @param {Record} updatedRecord - The updated record.
 * @returns {Promise<QueryResult>} A promise that resolves when the record is updated or rejects with an error.
 */
function updateRecordByField(tableName, field, value, updatedRecord) {
  const query = `UPDATE ${tableName} SET ? WHERE ${field} = ?`;
  return executeQuery(query, [updatedRecord, value]);
}

/**
 * Deletes a record from the specified table by the specified field and value.
 * @param {string} tableName - The name of the table to delete the record from.
 * @param {string} field - The field to query by.
 * @param {any} value - The value to match in the specified field.
 * @returns {Promise<QueryResult>} A promise that resolves when the record is deleted or rejects with an error.
 */
function deleteRecordByField(tableName, field, value) {
  const query = `DELETE FROM ${tableName} WHERE ${field} = ?`;
  return executeQuery(query, [value]);
}

module.exports = {
  createTable,
  dropTable,
  createRecord,
  readAllRecords,
  readRecordByField,
  updateRecordByField,
  deleteRecordByField
};
