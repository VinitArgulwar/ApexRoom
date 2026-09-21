import jwt from "jsonwebtoken";
import User from "../model/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "apexroom-super-secret-jwt-key";

export async function protect(req, res, next) {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ message: "Not authorized. Please login." });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({ message: "User account no longer exists." });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token is invalid or expired." });
    }
}
