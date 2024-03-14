import {v2 as cloudinary} from "cloudinary";
import fs from "fs"


          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINRY_CLOUD_NAME, 
  api_key: process.env.CLOUDINRY_API_KEY, 
  api_secret: process.env.CLOUDINRY_API_SECRET 
});

const uploadOnCloudinary= async (localFilePath)=>{
    try {
        if(!localFilePath)return null
        //upload on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        // fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        // fs.unlinkSync(localFilePath) //remove the locl file as upload got failed
        return null;
    }

}
export {uploadOnCloudinary}