import mongoose, { connect } from "mongoose";
import { DB_NAME } from "../constants.js";

// Connect to the database using the async function connectDB
const connectDB = async () => {
  try{
    // this gives us a object
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    // for check the host name
    console.log("mongodb connection successful !! DBHOST: " + connectionInstance.connection.host);
  }catch(error){
    console.log("MONGO DB connection failed: ",error);
    process.exit(1);
  }
}

export default connectDB;