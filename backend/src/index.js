import dotenv from "dotenv";
import http from "http";

import app from "./app.js";
import connectDB from "./db/db_connection.js";
import { initSocket } from "./socket/index.js";

dotenv.config({
    path: "./.env",
});

const PORT = process.env.PORT || 3000;

connectDB()
    .then(() => {
        const server = http.createServer(app);

        const io = initSocket(server);
        app.set("io", io);

        server.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error", err);
        process.exit(1);
    });
