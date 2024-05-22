import express from 'express';
import cors from 'cors';

// this cookieparser is used for storing the cookies in the browser of user
// So, we can apply CRUD operations in the browser
import cookieParser from 'cookie-parser';

const app = express();

// Middleware
// This is used for the CORS(Cross-Origin Resource Sharing)
// This is used for the security purpose
// Middleware is used that the user is logged in or not or somthing
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));

// these are the configuration to take the data from frontend
// This is using json with the max limit of 16kb
app.use(express.json({limit: "16kb"}));

// This is using the data fro the params(URL params)
app.use(express.urlencoded({extended: true, limit: "16kb"}));

// This is use for storing the file or pdf somthing
app.use(express.static('public'));

app.use(cookieParser());

export { app }
