import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshToken = async (userId) => {
  try{
    // find user by its id
    const user = await User.findById(userId);
    // geneating access token
    const accessToken = await user.generateAccessToken();
    // generating refresh token
    const refreshToken = await user.generateRefreshToken();

    // set the refresh token
    user.refreshToken = refreshToken;
    // it will show error while saving bcz wee are not providing other information
    await user.save({ validateBeforeSave: false });

    // returning both accessToken and refreshToken
    return { accessToken, refreshToken };
  }catch(e){
    throw new ApiError(500, "Somthing went wrong while generating access and refresh token")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  // steps to register a user ---
    // 1. get the user details from frontend(client)
    // 2. validation - not empty string
    // 3. check if the user is already registered: email, username
    // 4. check for avatar, check for images
    // 5. upload them on cludinary, avatar
    // 6. create a object of user -  create entry in the database
    //   (as respoonse from the database it give as it is do we have to hide the password and other details)
    // 7. remove password and refreshToken from the response
    // 8. check the user creation 
    // 9. send the response back to the client

  const {username, email, fullName, password} = req.body
  console.log("email: ", email)

  if(
    [username, email, fullName, password].some((field) => {
      field?.trim() === ""
    })
  ){
    throw new ApiError(400, "All fields are required")
  }

  const existingUser = await User.findOne({
    $or: [
      {username: username},
      {email: email}
    ]
  }).then((user) => {
    if(user){
      throw new ApiError(409, "User already exists")
    }
  }).catch((error) => {
    throw new ApiError(500, error.message)
  })

  if(existingUser){
    throw new ApiError(409, "User already exists")
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar is required")
  }
  // console.log(avatarLocalPath)
  // console.log("-----")

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar){
    throw new ApiError(400, "Avatar upload failed")
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    password,
    avatar: avatar?.url || "",
    coverImage: coverImage?.url || ""
  })
  console.log(user)

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )
  

  if(!createdUser){
    throw new ApiError(500, "Something went wrong while entering the user in the database")
  }

  return res.status(201).json(
    new ApiResponse(200, "User created successfully", createdUser)
  )

})

const loginUser = asyncHandler(async (req, res) => {
  // steps to login user
    // 1. retrieve data from user as req.body (request body)
    // 2. username or email 
    // 3. find the user
    // 4. password check
    // 5. generate access and refresh token
    // 6. send cookiee

  // 
  const {email, username, password} = req.body;
  
  console.log(email)
  if(!email && !username){
    throw new ApiError(400, "username or email are required")
  }

  const user = await User.findOne({
    $or: [{email}, {username}]
  })

  if(!user){
    throw new ApiError(400, "User not found")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401, "Invalid user credentials")
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser, accessToken: accessToken, refreshToken: refreshToken
      },
      "User logged in successfully"
    )
  )
})

const logoutUser = asyncHandler(async(req, res) => {
  // How to login user
  // remove cookie
  await User.findByIdAndUpdate(req.user._id, 
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }
  
  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
  
    if(!incomingRefreshToken){
      throw new ApiError(401, "unauthorized request")
    }
  
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401, "Invalid refresh token")
    }
    
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh token is expired or used")
    }
  
    const options = {
      httpOnly: true,
      secure: true,
    }
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken: accessToken, refreshToken: newRefreshToken }
      )
    )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})

export { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken
};