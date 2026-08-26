
import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware.js";

//Generate post
//POST/ api/posts/generate
export const generatePost = async (req: AuthRequest,res: Response): Promise<void>=>{

    try{
        const{prompt,tone,generateImage} = req.body;
        const apikey = process.env.GEMINI_API_KEY;
        if(!apikey){
            res.status(400).json({message:"Gemini API key is missing. PLease add it to your server/.env file."})
        return;
        }
    }
    catch(error){
        
    }
}


//Get generations
//GET/ api/posts/generations
export const getGenerations = async (req: AuthRequest,res: Response): Promise<void>=>{


}



//Get posts
//GET/ api/posts
export const getPosts = async (req: AuthRequest,res: Response): Promise<void>=>{


}




//Schedule posts
//POST/ api/posts
export const schedulePosts = async (req: AuthRequest,res: Response): Promise<void>=>{


}