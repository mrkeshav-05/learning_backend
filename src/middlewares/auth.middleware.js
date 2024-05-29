import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

// This will verify user is available or not
// This is the verifyJWT method that will be used to verify the user's token 
export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    if(!token){
      throw new ApiError(401, "Unauthorized request ")
    }
    
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
  // decodeToken has some things like - _id, payloads, etc.
  // this is find the user by their id in the decodedToken
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
  // checking the user exists or not exists
    if(!user){
      throw new ApiError(401, "Invalid Access Token")
    }
  
    req.user = user;
    // next is used to run the next function 
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token")
  }
  

})