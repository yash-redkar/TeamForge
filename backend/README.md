# 🚀 Project Camp Backend

A production-grade backend system designed to support collaborative team workflows with scalable architecture, real-time communication, and role-based access control.

This system provides a scalable backend foundation for team collaboration with:

Workspaces

Projects

Task Management

Real-Time Communication

Notifications

Global Search

Built using modern backend architecture principles including modular design, role-based access control, real-time events, and scalable API structure.

# 🧠 Key Highlights

✨ Features implemented in this backend system:

🏢 Multi-Workspace SaaS Architecture

🔐 Role-Based Access Control

⚡ Real-Time Communication (Socket.IO)

📋 Task Workflow Management

🔎 Global Search Engine

📜 Activity Logging & Audit Trail

🔔 Real-Time Notification System

🛡️ Secure JWT Authentication

📎 File Attachments Support

🧩 Modular & Scalable Architecture

# 🏗️ System Architecture

The platform follows a hierarchical collaboration structure:

```
User
 ↓
Workspace
 ↓
Project
 ↓
Tasks
 ↓
Subtasks
 ↓
Comments
```

Additional backend modules:

🔔 Notifications

📜 Activity Logs

💬 Chat System

🔎 Global Search

🔐 Authentication System

Secure authentication system built using JWT tokens.

# Features

👤 User Registration

📧 Email Verification

🔑 Secure Login

🔁 Access Token + Refresh Token

🔒 Password Hashing (bcrypt)

🔄 Forgot / Reset Password

🛡️ Role-Based Authorization

🏢 Workspace Management

Workspaces act as the top-level collaboration environment.

Features

- Create workspace
- Manage workspace members
- Assign workspace roles
- Leave workspace
- Transfer workspace    ownership
- Activity tracking

Workspace Roles
| Role | Description |
|-----|-------------|
| 👑 Owner | Full control |
| ⚙️ Admin | Manage members & projects |
| 👤 Member | Work on projects |
| 👀 Viewer | Read-only access |
📁 Project Management

Projects organize collaborative work inside workspaces.

Features

- Create projects
- Update project details
- Delete projects
- Manage project members
- Project role permissions

Project Roles
| Role | Access |
|-----|--------|
| 🛠 Admin | Manage project |
| 👤 Member | Work on tasks |

Tasks represent units of work inside projects.

Features

-Create tasks
-Update tasks
-Delete tasks
-Assign tasks
-Track task status
-File attachments
-Task Status Workflow
-TODO → IN_PROGRESS → DONE

Each task includes:

-Assignee
-Creator
-Attachments
-Status
-Timestamps

🧩 Subtask Management

Tasks can contain subtasks for smaller work units.

Features:

-Create subtasks
-Update subtasks
-Mark subtasks completed

Delete subtasks

💬 Task Comments

Tasks support discussion threads.

Features

-Add comment
-Edit comment
-Delete comment
-Mention users
-Comment history

Example:

@member4 please review this API
🔔 Notification System

A full notification system is implemented.

Triggered By

Task assignments

Task comments

User mentions

System events

Features

-User-specific notifications
-Read / unread tracking
-Real-time delivery
-Metadata support

📜 Activity Logging

All major actions are recorded for audit tracking.

Examples:

Workspace created

Project created

Task updates

Member changes

Comment actions

⚡ Real-Time Communication

Powered by Socket.IO.

Supports:

Workspace chat

Project chat

Task discussions

Instant updates

Users join rooms based on permissions.

🔎 Global Search

Global search across multiple entities.

| Entity   | Search Fields |
|---------|--------------|
| Tasks   | title, description |
| Projects | name, description |
| Members | username, email |

MongoDB text indexes power the search system.

# 🛠 Tech Stack

The backend follows a modular MVC architecture designed for scalability and maintainability.

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose

### Real-Time
- Socket.IO

### Authentication
- JWT Access Tokens
- JWT Refresh Tokens

### File Upload
- Multer

# 🌐 API Base Path

All endpoints are prefixed with:

/api/v1

Example modules:

/auth
/workspaces
/projects
/tasks
/chat
/notifications
/activity
/search

🔐 Security Features

Security protections include:

JWT authentication

Role-based permissions

Input validation

MongoDB sanitization

HTTP header protection

Rate limiting

HPP protection

Secure file uploads

🔮 Future Plans

Frontend application will include:

📊 Dashboard

🏢 Workspace management UI

📁 Project overview pages

🗂️ Kanban task board

📄 Task detail pages

🔔 Notification center

💬 Real-time chat

🔎 Global search interface

📌 Project Status

✅ Backend development is mostly complete.

Implemented systems:

Authentication

Workspace collaboration

Project management

Task workflow

Comments

Notifications

Activity logs

Global search

Real-time communication

The backend is now ready for frontend integration.

# 👨‍💻 Author

**Yash**

Backend Developer  
Node.js | Express | MongoDB | Real-Time Systems