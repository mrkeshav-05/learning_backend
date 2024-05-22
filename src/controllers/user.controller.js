import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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

  const {username, email, fullname, password} = req.body
  console.log("email: ", email)

  if(
    [username, email, fullname, password].some((field) => {
      field?.trim() === ""
    })
  ){
    throw new ApiError(400, "All fields are required")
  }

  User.findOne({
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

  // const existingUser = User.findOne({
  //   $or: [
  //     {username: username},
  //     {email: email}
  //   ]
  // })

  // if(existingUser){
  //   throw new ApiError(409, "User already exists")
  // }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar){
    throw new ApiError(500, "Avatar upload failed")
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullname,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || ""
  })

  const createdUser = await user.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new ApiError(500, "Something went wrong while entering the user in the database")
  }

  return res.status(201).json(
    new ApiResponse(200, "User created successfully", createdUser)
  )

})

export { registerUser };