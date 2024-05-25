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
    console.log("this is in upload",localFilePath)
    if(!localFilePath){
      // console.log("lo")
      return {error: "File path is missing"};
    };
    // Check if the file exists before uploading
    if (!fs.existsSync(localFilePath)) {
      return { error: "File not found" };
    }
    // upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    });//file has been uploaded on cloudinary
    console.log("what about respo",response);

    // Remove the local file after successful upload
    fs.unlinkSync(localFilePath);
    console.log("Local file deleted:", localFilePath);
    return response;
  }catch(error){
    fs.unlinkSync(localFilePath); //remove the locally stored file as upload get failed
  }
}


export { uploadOnCloudinary };