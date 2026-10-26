import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { Generation } from "../models/Generation.js";
import { Post } from "../models/Post.js";

// Helper to poll Leonardo.ai
const pollLeonardoJob = async (
  generationId: string,
  apikey: string
): Promise<string> => {
  const maxRetries = 20;
  const delay = 5000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(
        `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
        {
          headers: {
            accept: "application/json",
            authorization: `Bearer ${apikey}`,
          },
        }
      );

      const generation = response.data.generations_by_pk;

      console.log("Leonardo status:", generation.status);

      if (generation.status === "COMPLETE") {
        if (
          generation.generated_images &&
          generation.generated_images.length > 0
        ) {
          return generation.generated_images[0].url;
        }

        throw new Error(
          "Generation complete but no images found."
        );
      }

      if (generation.status === "FAILED") {
        throw new Error(
          "Leonardo.ai generation failed."
        );
      }

      // Wait 5 seconds before polling again
      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    } catch (err: any) {
      console.error(
        "Polling error:",
        err?.response?.data || err?.message
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }

  throw new Error(
    "Leonardo.ai generation timed out."
  );
};


// Generate post
// POST /api/posts/generate

export const generatePost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      prompt,
      tone,
      generateImage
    } = req.body;

    // ----------------------------
    // Gemini API
    // ----------------------------

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(400).json({
        message:
          "Gemini API key is missing. Please add it to your server/.env file.",
      });

      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    // Generate Text
    const textResponse =
      await ai.models.generateContent({
        model: "gemini-2.5-flash",

        contents: `
Generate a social media post based on this prompt:

"${prompt}"

Tone: ${tone}

Include relevant hashtags.

Format the response as JSON with "content" and "imagePrompt" fields.

The "imagePrompt" should be a highly descriptive prompt for an image generator that complements the post.
        `,
      });

    // ----------------------------
    // Parse Gemini response
    // ----------------------------

    let content = "";
    let imagePrompt = prompt;

    try {
      const rawText = textResponse.text || "";

      // Remove markdown code fences
      const cleanedText = rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const data = JSON.parse(cleanedText);

      content = data.content;
      imagePrompt = data.imagePrompt;
    } catch (e) {
      console.error(
        "Gemini JSON parsing failed"
      );

      content = textResponse.text || "";
    }

    // ----------------------------
    // Generate Image
    // ----------------------------

    let mediaUrl = "";

    if (generateImage) {
      try {
        const leonardoKey =
          process.env.LEONARDO_API_KEY;

        if (!leonardoKey) {
          throw new Error(
            "Leonardo API key is missing."
          );
        }

        // Generate image using Leonardo
        const leoResponse =
          await axios.post(
            "https://cloud.leonardo.ai/api/rest/v2/generations",

            {
              public: false,

              model: "gpt-image-2",

              parameters: {
                quality: "LOW",
                prompt: imagePrompt,
                quantity: 1,
                width: 1024,
                height: 1024,
                prompt_enhance: "OFF",
              },
            },

            {
              headers: {
                accept: "application/json",
                authorization:
                  `Bearer ${leonardoKey}`,

                "content-type":
                  "application/json",
              },
            }
          );

        console.log(
          "Leonardo response:",
          leoResponse.data
        );

        // Get generation ID
        const generationId =
          leoResponse.data?.generate?.generationId;

        if (!generationId) {
          throw new Error(
            "Leonardo generation ID not found."
          );
        }

        console.log(
          "Generation ID:",
          generationId
        );

        // Poll until complete
        const tempUrl =
          await pollLeonardoJob(
            generationId,
            leonardoKey
          );

        console.log(
          "Leonardo image URL:",
          tempUrl
        );

        // ----------------------------
        // Upload image to Cloudinary
        // ----------------------------

        const uploadResult =
          await cloudinary.uploader.upload(
            tempUrl,
            {
              folder: "ai-generations",
            }
          );

        mediaUrl =
          uploadResult.secure_url;

        console.log(
          "Cloudinary URL:",
          mediaUrl
        );

      } catch (err: any) {
        console.error(
          "Image generation failed:",
          err?.response?.data ||
          err?.message
        );
      }
    }

    // ----------------------------
    // Save generation to MongoDB
    // ----------------------------

    const generation =
      await Generation.create({
        user: req.user._id,

        prompt,

        content,

        mediaUrl,

        mediaType: mediaUrl
          ? "image"
          : undefined,

        tone,
      });

    // ----------------------------
    // Send response
    // ----------------------------

    res.status(201).json({
      message:
        "Post generated successfully",

      generation,
    });

  } catch (error: any) {
    console.error(
      "Generate post error:",
      error
    );

    res.status(500).json({
      message:
        error?.message ||
        "Server error",
    });
  }
};

//Get generations
// //GET/ api/posts/generations
export const getGenerations = async (req: AuthRequest,res: Response): Promise<void>=>{
      try {
        const generations = await Generation.find({user:req.user._id}).sort({createdAt: -1})
      }
       catch (error: any) {
        res.status(500).json({message:error?.message || "Server error"});
        
      }  

}



// //Get posts
// //GET/ api/posts
export const getPosts = async (req: AuthRequest,res: Response): Promise<void>=>{
    try {
        
        const posts = await Post.find({user: req.user._id})
        res.json(posts)
    } catch (error:any) {
        res.status(500).json({message:error?.message || "server error"});
        
    }
}




// //Schedule posts
// //POST/ api/posts
export const schedulePosts = async (req: AuthRequest,res: Response): Promise<void>=>{
        try {
            const { content, platforms, scheduledFor, status} = req.body;
            // parse platforms if it comes as a stringified array from Form Data
            let parsedPlatforms = platforms;
            if(typeof platforms === "string"){
                try {
                    parsedPlatforms = JSON.parse(platforms)
                    
                } catch (e) {
                    parsedPlatforms = platforms.split(",");
                }

            }
            let mediaUrl: string | undefined = req.body.mediaUrl;
            let mediaType: "image" | "video" | undefined = req.body.mediaType;

            if(req.file){
                const result = await new Promise<any>((resolve, reject)=>{
                    const stream = cloudinary.uploader.upload_stream({resourse_type:"auto",
                        folder:"social-scheduler"},(error,result)=>{
                            if(error) reject(error);
                            else resolve(result)

                        });
                        stream.end(req.file!.buffer);
                      });
                        mediaUrl = result.secure_url;
                        mediaType = result.resource_type === "video" ? "video" : "image";
                }
                const post = await Post.create({ 
                  user: req.user._id,
                  content,
                  platforms:parsedPlatforms,
                  mediaUrl,
                  mediaType,
                  scheduledFor,
                  status,
                })
                res.status(201).json(post)
            }
        catch (error: any) {
            res.status(500).json({message: error?.message || "server error"});
            
        }

}