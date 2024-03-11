
import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
    path:'./env'
})

connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log("ERROR:",error)
        throw error
    })
app.listen(process.env.PORT||8000,()=>{
    console.log(`server running at ${process.env.PORT}`)
})
})
.catch((err)=>{
    console.log("MongoDB connection error",err)
})







/*
import express  from "express";

const app=express()

;(async ()=>{
    try{
        mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("ERROR:",error)
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`Listingon ${process.env.PORT}`)
        })

    }catch(error){
        console.log("ERROR",error)
        throw error
    }
})()*/