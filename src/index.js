// this is because of when this first file in the backend loaded then the 
// environment variables are not loaded so we have to load the environment variables
// 1. way ---
// require('dotenv').config();

// 2. way ---
// also some changes in the package.json file ---
// "nodemon" : nodemon -r dotenv/config --experimental-json-modules src/index.js
import dotenv from 'dotenv';

// import { DB_NAME } from './constants';

import connectDB from './database/index.js';
import express from 'express';

dotenv.config({ path: './env'});

const app = express();

connectDB()
  .then(() => {
    app.on('error', (error) => {
      console.log("Error connecting to the database: ", error);
      throw error;
    })
    app.listen(process.env.PORT || 8000, () => {
      console.log("Server is running on port " + process.env.PORT);
    });
  })
  .catch((error) => {
  console.log("MONGODB Connection failed !!! ", error);
  throw error;
  });











/*
import express from 'express';
const app = express();

// Connect to the database using the async function connectDB
const connectDB = async () => {
  try{
    // connect to databse
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

    // listen for errors
    app.on("error", ()=>{
      console.log("Error connecting to the database: ", error);
      throw error;
    })

    // listen for the app
    app.listen(process.env.PORT, ()=>{
      console.log("App is listening on port " + process.env.PORT)
    })
  }catch(error){
    console.log(error);
    throw error;
  }
}

// this is using the if-fi function to call the connectDB function
// ;( async () => {
//   try{
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//   }catch(error){
//     console.log(error);
//     throw error;
//   }
// })()


*/