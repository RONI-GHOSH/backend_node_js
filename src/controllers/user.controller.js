import {asynchandler} from "../utils/asynchandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import  Jwt  from "jsonwebtoken"
import mongoose from "mongoose"


const generateAccessandRefreshTokens = async(userId)=>{
   try {
    const user=  await User.findById(userId)
   const accessToken= user.generateRefreshToken()
   const refreshToken= user.generateAccessToken()
   
   user.refreshToken = refreshToken
   user.accessToken = accessToken
   user.save({validateBeforeSave:false})

   return {accessToken,refreshToken}
      
   }catch(error){
      throw new ApiError(500,"Cannot generate tokens")
   }

}
const registerUser = asynchandler(async(req,res)=>{

   // get user details from frontend
   //validtion of details - not empty
   //check if user already exists: username, email
   //check for images,check for avatar
   //upload them to cloudinry
   //create user object  - create entry in db
   //remove password and refresh token field from response
   //check for user creation
   //return res

   const {fullname,email,username,password} =req.body

   console.log(email)

   if([fullname,email,username,password].some((field)=>field?.trim()==="")){
      throw new ApiError(400,"All fields are required")
   }

  const existedUser= await User.findOne({

      $or:[
         {username},{email}
      ]
   })
   if(existedUser){
      throw new ApiError(409,"Username or email already exists")
   }
  const avatarLocalPath= req.files?.avatar[0]?.path


  let coverImageLocalPath;
  if(req.files&& Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
   coverImageLocalPath= req.files?.coverImage[0]?.path
  }
  
  if(!avatarLocalPath){
   throw new ApiError(400,"Avatr file is required")
  }
  const avatar=await uploadOnCloudinary(avatarLocalPath)
  const coverImage=await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar){
   throw new ApiError(400,"Avatr file is not uploaded")
  }
  const user = await User.create(
   {
      fullname,
      avatar:avatar.url,
      coverImage:coverImage?.url||"",
      email,
      password,
      username:username.toLowerCase()

   }
  )
  const createdUser= await User.findById(user._id).select(
   "-password -refreshToken"
  )
  if(!createdUser){
   throw new ApiError(500,"something went wrong while registering user")
  }
  
  return res.status(201).json(new ApiResponse(200,createdUser,"User registered successfully"))



})

const loginUser = asynchandler(async (req,res)=>{
   // get data
   // validate username or email
   // find user
   //password check
   //access and refresh token
   //send cookie

   const {email,username,password}=req.body

   if(!(username||email)){
      throw new ApiError(400,"username or password required")
   }
   const  user =await User.findOne({
      $or:[{username},{email}]
   })
   if(!user){
      throw new ApiError(404,"user does not exists")
   }
   const isPassworValid = await user.isPasswordCorrect(password)
   if(!isPassworValid){
      throw new ApiError(401,"Incorrect password")
   }
  const {accessToken,refreshToken}= await generateAccessandRefreshTokens(user._id)

  const loggedInUser=await User.findById(user._id).select("-password -refreshToken")
  const options = {
   httpOnly:true,
   secure:true
  }
  return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(new ApiResponse(200,{
   user:loggedInUser,accessToken,refreshToken
  },"User logged In successfully"))

})

const logoutUser = asynchandler(async(req,res)=>{
       

      await User.findByIdAndUpdate(
         req.user._id,
         {
            $set:{
               refreshToken:undefined
            }
         },
         {
            new:true
         }
       )
       const options = {
         httpOnly:true,
         secure:true
        }

        return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,{},"Logged out"))
})

const refreshAccessToken = asynchandler(async(req,res)=>{
  const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken 
if(!incomingRefreshToken){
   throw new ApiError(401,"Unauthorize request")
}
try {
   const decodedToken=Jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
   
   const user =await User.findById(decodedToken?._id)
   if(!user){
      throw new ApiError(401,"Invalid refreshToken")
   }
   if(incomingRefreshToken!==user?.refreshToken){
      throw new ApiError(401,"expired or used refreshToken")
   
   }
   const options ={
      httpOnly:true,
      secure:true
   }
   const {accessToken,newrefreshToken}=await generateAccessandRefreshTokens(user._id)
   
   return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",newrefreshToken,options).json(
      new ApiResponse(200,{
         accessToken,refreshToken:newrefreshToken
      }
      ,"Tokens refreshed"
      )
   )
} catch (error) {
   throw new ApiError(401,error?.message||"Invalid refresh token")
}


})
const changeCurrentPassword = asynchandler(async(req,res)=>{

   const {oldPassword,newPassword}=req.body
   

   const user = await User.findById(req.user?._id)

  const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
   throw new ApiError(400,"Invalid old password")
  }
  user.password=newPassword
  await user.save({validateBeforeSave:false})

  return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))

})
const getCurrentUser = asynchandler(async(req,res)=>{
   return res.status(200).json(200,req.user,"Current user fetched successfully")
})
const updateAccountDetails = asynchandler(async(req,res)=>{
   const {fullname,email} = req.body

   if(!fullname||!email){
      throw new ApiError(400,"All fields required")
   }
   const user = User.findByIdAndUpdate(
      req.user?._id,
{
  
   $set:{
      fullname,
      email
   }






},{new:true}
   ).select("-password")

   return res.status(200).json(new ApiResponse(200,user,"Account updated successfully"))
})
const updateUserAvatar = asynchandler(async(req,res)=>{
   const avatarLocalPath = req.file?.path

   if(!avatarLocalPath){
      new ApiError(400,"Avatar file is missing!")
   }
   const avatar =await uploadOnCloudinary(avatarLocalPath)
   if(!avatar.url){
      new ApiError(400,"Error uploading avatar")
   }
   const user =await  User.findByIdAndUpdate(req.user?._id
      ,
      {

          $set:{
            avatar:avatar.url
          }


      },
      {new:true}
      
      
      ).select("-password")
      return res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))
})

const updateUserCoverImage = asynchandler(async(req,res)=>{
   const coverImageLocalPath = req.file?.path

   if(!coverImageLocalPath){
      new ApiError(400,"Cover image file is missing!")
   }
   const cover =await uploadOnCloudinary(coverImageLocalPath)
   if(!cover.url){
      new ApiError(400,"Error uploading avatar")
   }
   const user =await  User.findByIdAndUpdate(req.user?._id
      ,
      {

          $set:{
            coverImage:cover.url
          }


      },
      {new:true}
      
      
      ).select("-password")
      return res.status(200).json(new ApiResponse(200,user,"Cover image updated successfully"))
})

const getUserChannelProfile = asynchandler(async(req,res)=>{

   const {username} = req.params
   if(!username?.trim()){
      throw new ApiError(400,"username is missing")
   }
   
   const channel = await User.aggregate([
      {
         $match:{
            username:username?.toLowerCase()
         }
      },
      {
         $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
         }
      },
      {
         $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribeTo"
         }
      },
      {
         $addFields:{
            subscribersCount:{
               $size:"$subscribers"
            },
            channelsSubscribedToCount:{
               $size:"$subscribeTo"
            },
            isSubscribed:{
               $cond:{
                  if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                  then:true,
                  else:false
               }
            }
         }
      },
      {
         $project:{
            fullname:1,
            username:1,
            subscribersCount:1,
            channelsSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
         }
      }

   ])
   console.log(channel)
   if(!channel?.length){

     throw new ApiError(404,"Channel does not exists")
   }
   return res.status(200).json(new ApiResponse(200,channel[0],"User channel fetched successfully"))


})

const getWatchHistory = asynchandler(async(req,res)=>{
    
   const user=await User.aggregate(
      [
         {
            $match:{
               _id:new mongoose.Types.ObjectId(req.user._id)
            }
         },
         {
            $lookup:{
               from:"videos",
               localField:"watchHistory",
               foreignField:"_id",
               as:"watchHistory",
               pipeline:[
                  {
                     $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                           {
                              $project:{
                                 fullname:1,
                                 username:1,
                                 avatar:1
                              }
                           }
                        ]
                     }
                  },{
                     $addFields:{
                        owner:{
                           $first:"$owner"
                        }
                     }
                  }
               ]
            }
         }
      ]
   )
  return res.status(200).json(
   new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully")
  )

})




export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory}