import mongoose from "mongoose";   
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/apexroom";
        await mongoose.connect(mongoUri);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};

export default connectDB;