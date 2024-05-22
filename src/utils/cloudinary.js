import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// this is for uploading file on cloudinary and removing the file from the local storage
const uploadOnCloudinary = async (localFilePath) => {
  try{
    if(!localFilePath) {
      throw new Error("File path is required");
    }
    // upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {resource_type: "auto"}, (error, result) => {
      if(error) {
        throw new Error(error.message);
      }
      return result;
    });//file has been uploaded on cloudinary
    console.log("file has been uploaded on cloudinary");
    console.log(response.url);
    return response;
  }catch(error){
    fs.unlinkSync(localFilePath); //remove the locally stored file as upload get failed
  }
}


export { uploadOnCloudinary };