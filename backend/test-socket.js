
import { io } from "socket.io-client";

// ✅ set these
const BASE_URL = "http://127.0.0.1:8000";
const ACCESS_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTk0OGYwYzJiMWJlNDA1NmNjN2UyYmYiLCJlbWFpbCI6InRlc3QxMjNAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6InRlc3QxMjMiLCJpYXQiOjE3NzIxMDA3OTIsImV4cCI6MTc3MjE4NzE5Mn0.A4wYpHQ9b-dLl58SBD6cdFdHco6ENNiNA8xJKN44LT0";

    const WORKSPACE_ID = "69971aefa3dfa3053f7ee147";
    const PROJECT_ID = "699e93d4d18c662bcf76bb1b";

// ✅ set your 3 conversation IDs here
const CONVERSATIONS = [
    { label: "workspace", id: "6999dd6eaba6b8e1185761e0" },
    { label: "project", id: "6999ad0efc469e24a427d798" },
    { label: "task", id: "699ea929d7fa8125d51a6001" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const socket = io(BASE_URL, {
    transports: ["websocket"], // force ws (clean testing)
    auth: { token: ACCESS_TOKEN },
});

socket.on("connect", async () => {
    console.log("✅ Connected:", socket.id);

    console.log("➡️ Joining project room (kanban) ...");
    socket.emit("join_project", {
        workspaceId: WORKSPACE_ID,
        projectId: PROJECT_ID,
    });

    await sleep(500);

    for (const c of CONVERSATIONS) {
        console.log(`\n➡️ Joining ${c.label}:`, c.id);

        socket.emit("join_conversation", { conversationId: c.id });

        // wait a bit so server joins room before sending
        await sleep(500);

        const msg = `Hello from test (${c.label}) at ${new Date().toISOString()}`;
        console.log(`➡️ Sending to ${c.label}:`, msg);

        socket.emit("send_message", { conversationId: c.id, text: msg });

        await sleep(1000);
    }

    console.log(
        "\n✅ Chat test done. Now keep this running and update tasks from Postman...",
    );

    // If you want auto-exit after 60s, uncomment:
    // setTimeout(() => socket.disconnect(), 60000);

});

socket.on("joined_conversation", (data) => {
    console.log("✅ Joined:", data);
});

socket.on("joined_project", (data) => {
    console.log("✅ Joined project room:", data);
});

socket.on("message_created", (msg) => {
    console.log("✅ Message received:", {
        conversation: msg.conversation,
        text: msg.text,
        sender: msg.sender?.username,
    });
});

socket.on("task_created", (task) => {
    console.log("🔥 task_created:", {
        id: task._id,
        status: task.status,
        title: task.title,
    });
});

socket.on("task_updated", (task) => {
    console.log("🔥 task_updated:", {
        id: task._id,
        status: task.status,
        title: task.title,
    });
});

socket.on("task_deleted", (payload) => {
    console.log("🔥 task_deleted:", payload); // { taskId }
});


socket.on("error_event", (err) => {
    console.log("❌ error_event:", err);
});

socket.on("connect_error", (err) => {
    console.log("❌ connect_error:", err.message);
});