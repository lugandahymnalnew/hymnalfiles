// Import the required modules
// const MongoClient = require('mongodb').MongoClient;
const { MongoClient } = require("mongodb");
const url = "mongodb+srv://kitaroghope:kitasrog@cluster0.9uort.mongodb.net/?retryWrites=true&w=majority";



// DB connection an creating client
// Define the MongoDB connection URL and database name

var client;

async function createClient(){
    try {
        // client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        client = new MongoClient(url)
        console.log('Connected to MongoDB server');
        return await checkClient();
    } catch (err) {
        console.log(err.message)
    }
}

async function isClientConnected(client) {
  try {
    // Check if the client is connected by running a simple command
    await client.db('admin').command({ ping: 1 });
    return true;
  } catch (err) {
    console.log("check connect error: "+err.message)
    // Return false if there is an error (e.g. NetworkTimeout, ServerSelectionTimeoutError)
    return false;
  }
}

async function checkClient(){
    if(!client){
        return await createClient();
    }
    else if(!await isClientConnected(client)){
        try {
            console.log('reconnect is clear')
            return await checkClient();
        } catch (err) {
            console.log("Mongo error: "+err.message)
            return await checkClient();
        }
    }
    else{
        console.log("check complete")
        return true
    }
}


async function createListing(newList, dbName, tName) {
    if(!await checkClient()){return;}
    try {
      const result = await client.db(dbName).collection(tName).insertOne(newList);
      console.log(`Id : ${result.insertedId} : from createListing function`);
    } catch (err) {
      console.log(`An error occurred: ${err.message}`);
    }
}
// Defining the CRUD functions
// add new item to dataBase
/**
 * Creates a new listing.
 * @param {object} newList - this should be an object e.g {"field name":"value"}.
 * @param {string} dbName  - Database name e.g. "database_name". no spaces allowed.
 * @param {string} tName  - Table or collection name.
 * @returns {} nothing.
 */
// Create Many rows or Create table if not Exists
/**
 * Creates many listings or adds more than 1 row.
 * @param {Array} newLists - newLists should be an array of objects e.g [{object 1},{object2},...{object n}].
 * {object 1} can be {"name":"John","age":17}
 * @param {string} dbName  - Database name e.g. "database_name". no spaces allowed.
 * @param {string} tName  - Table or collection name.
 * @returns {} nothing.
 */
async function createListings(newLists, dbName,tName){ // newLists is an array of objects.
    if(!await checkClient()){return;}
    try{
        const result = await client.db(dbName).collection(tName).insertMany(newLists);
        console.log(`${result.insertedIds} Id(s) are created. From createListings function`);
    }
    catch (err) {
        console.log(`An error occurred: ${err.message}`);
    }
}

// Reading one or returning one item
/**
 * Reads one single row or returns one .
 * @param {Object} newLists - this should be an objects e.g {"key":"value"}
 * @param {string} dbName  - Database name e.g. "database_name". no spaces allowed.
 * @param {string} tName  - Table or collection name.
 * @returns one row.
 */
async function readRow(nameOfRow, dbName,tName){
    try{
        const result = await client.db(dbName).collection(tName).findOne(nameOfRow);
        if(result){
            return result;
        }else{
            console.log("null")
        }
    }
    catch (err) {
        console.log(`An error occurred: ${err.message}`);
    }
}

// Reading one rows
async function readRows(nameOfRow,dbName,tName){ // nameOfRow is place holder for search criteria
    if(!await checkClient()){return;}
    try{
        const cursor = client.db(dbName).collection(tName).find(nameOfRow);
        let result = await cursor.toArray();
        if(result){
            console.log("From readRows: "+result)
            return result;
        }else{
            console.log("null")
        }
        // await client.close(true);
    }
    catch(err) {
        console.log(`An error occurred: ${err.message}`);
        return null;
    }
}

// Updating one row
async function updateRow(nameOfRow, upddateList,dbName,tName){
    if(!await checkClient()){return;};
    try{
        const result = await client.db(dbName).collection(tName).updateOne(nameOfRow, {$set : upddateList});
        console.log(`updated ${result.modifiedCount} rows`);
    }
    catch (err) {
        console.log(`An error occurred: ${err.message}`);
    }
}

// Upserting one row / create row if it doesnt exist
async function updateRow2(nameOfRow, upddateList,dbName,tName){
    if(!await checkClient()){return;};
    try{
        const result = await client.db(dbName).collection(tName).updateOne(nameOfRow, {$set : upddateList},{upsert : true});
        if(result.upsertedCount > 0){
            console.log(`upserted ${result.upsertedCount} rows`);
        }
        else{
            console.log(`updated ${result.modifiedCount} rows`);
        }
    }
    catch (err) {
        console.log(`An error occurred: ${err.message}`);
    }
}

// Updating many rows
// commonColumns is an object i.e. {columnName}

// updating many rows to upsert many, Imclude {upsert: true} as an option
async function updateRows(commonColumn, upddateList,dbName,tName){
    if(!await checkClient()){return;}
    try{
        const result = await client.db(dbName).collection(tName).updateMany(commonColumn, {$set : upddateList});
        console.log(`updated ${result.modifiedCount} rows`);
    }
    catch (err) {
        console.log(`An error occurred: ${err.message}`);
    }
}

// Adding row if it does not exist
async function updateRows2(commonColumn, upddateList,dbName,tName){
    if(!await checkClient()){return;}
    try{
        const result = await client.db(dbName).collection(tName).updateMany(commonColumn, {$set : upddateList},{upsert: true});
        console.log(`updated ${result.modifiedCount} rows`);
    }
    catch (err) {
        console.log(`An error occurred: ${err.message}`);
    }
}

//deleting one row: Name of row is an object, i.e. {"column name":"Value"}
async function deleteRow(nameOfRow,dbName,tName){
    if(!await checkClient()){return;}
    try{
        const result = await client.db(dbName).collection(tName).deleteOne(nameOfRow);
        console.log(`deleted ${result.deletedCount} row(s)`);
    }
    catch (err) {
        console.log(`An error occurred: ${err.message}`);
    }
}
// Deleting rows: Name of row is an object, i.e. {"column name": "Value"}
async function deleteRows(nameOfRow,dbName,tName){
    const result = await client.db(dbName).collection(tName).deleteMany(nameOfRow);
    console.log(`deleted ${result.deletedCount} row(s)`);
}

// Showing available databases
async function listDatabeses(){
    await checkClient
    let list = await client.db().admin().listDatabases();
    console.log("All databases");
    list.databases.forEach(db => {
        console.log(" - " +db.name);
    });
    return list.databases;
}
// All tables in a db
async function listTables(dbName) {
    if (!await checkClient()) {
        return;
    }

    try {
        let list = await client.db(dbName).listCollections().toArray();
        const tableNames = list.map(collection => collection.name);
        console.log("Table list: " + tableNames);
        return tableNames;
    } catch (error) {
        console.log(error.message);
    }
}

//
async function createTable(dbName,tName){
    if(!await checkClient()){return;}
    try{
        const result = await client.db(dbName).createCollection(tName);
    }
    catch(err){
        console.log(err.message);
        return err.message;
    }
    createListing({_id:tName,seq:0},"Sys_db","counter")
}
async function autoInc(tName){
    if(!await checkClient()){return;}
    try {
        // const result = await client.db("Sys_db").collection("counters").updateOne({_id: tName}, {$set :  {seq: 1}},{upsert : true});
        const result = await client.db("Sys_db").collection("counters").findOneAndUpdate({_id: tName},{$inc: {seq: 1}},{returnOriginal: false, upsert:true});
        console.log(result.value.seq)
        console.log(tName+result.value.seq)
        return tName+result.value.seq;
    } catch (err) {
        if(err.message == "Cannot read properties of null (reading 'seq')"){
            return await autoInc(tName);
        }
        else{
            console.log("err: "+err.message)
            return;
        }
    }
}
// Export the CRUD functions
module.exports = {
    createListing, 
    createListings, 
    readRow, 
    readRows, 
    updateRow, 
    updateRow2, 
    updateRows, 
    updateRows2, 
    deleteRow, 
    deleteRows, 
    listDatabeses,
    listTables,
    createTable,
    autoInc
};
