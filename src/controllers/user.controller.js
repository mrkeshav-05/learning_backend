import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";

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

  return res
  .status(201)
  .json(
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

const changeCurrentPassword = asyncHandler(async (res, req) => {
  // steps to get current password
  const { oldpassword, newpassword, confirmpassword } = req.body;

  if(!(newpassword === confirmpassword)) {
    throw new ApiError(400, "confirm password does not match with new password")
  }
  const user = await User.findById(req.user?._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldpassword)

  if(!isPasswordCorrect) {
    throw new ApiError(401, "Invalid old password")
  }
  user.password = newpassword
  await user.save({validateBeforeSave: false})

  return res
  .status(200)
  .json(new ApiResponse(200, {success: true}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async () => {
  return res
  .status(200)
  .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async () => {
  const {fullName, email} = req.body;

  if(!fullName || !email) {
    throw new ApiError(400, "All fields are required")
  }
  User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "Account details updated successfully")
  )
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if(!avatarLocalPath){
    new ApiError(400, "Avatar file is missing")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if(!avatar.url){
    new ApiError(400, "Error while uploading avatar")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar: avatar.url
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "avatar updated successfully")
  )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if(!coverImageLocalPath){
    new ApiError(400, "CoverImage file is missing")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!coverImage.url){
    new ApiError(400, "Error while uploading coverImage")
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage: coverImage.url
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(
    new ApiResponse(200, user, "coverImage updated successfully")
  )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const {username} = req.params

  if(!username?.trim()){
    throw new ApiError(400, "Username is missing")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: {$in: [req.user?.id, "$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,

      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(404, "Channel does not exists")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200, channel, "Channel details fetched successfully")
  )
})

const getWatchHistory = asyncHandler(async (res, req) => {
  
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  }
                },
                // the next pipleline is for stroring the well organised data in the owner
                {
                  $addFields: {
                    owner: {
                      $first: "$owner"
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(
    new ApiResponse(200, user[0].watchHistory, "watchHistory fetched successfully")
  )

})


export { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};


// One HomwWork for deleting the previous avatar and coverImage of the user from the clodinary