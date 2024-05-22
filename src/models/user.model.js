import mongoose, {Schema} from 'mongoose';
// this token is like key to access resources
import jwt from 'jsonwebtoken';


import bcrypt from 'bcrypt';

const userSchema = new Schema({
  username:{
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,// this is for searching in the database
  },
  email:{
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  fullName:{
    type: String,
    required: true,
    trim: true,
    index: true,// this is for searching in the database
  },
  avatar:{
    type: String, //cloudanry url
    required: [true],
  },
  coverImage:{
    type: String, //cloudanry url
  },
  watchHistory:[
    {
      type: Schema.Types.ObjectId,
      ref: 'Video'
    }
  ],
  password:{
    type: String,
    required: [true, 'Password is required'],//this is for the error message
  },
  refreshToken:{
    type: String,
  },
}, {timestamps: true});

//this is for saving the password in the database
userSchema.pre("save", async function (next) { //this syntax of callback bcz this keyword is not used in arrow function
  if(!this.isModified("password")){// this is for checking that the password is modified or not
    return next();
  }
  this.password = bcrypt.hash(this.password, 10);// this.password is for databse password and 10 is for the hashing of password
  next();
})

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}
userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_SECRET
    }
  )
}

export const User = mongoose.model('User', userSchema);
