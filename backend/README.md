# TeamForge Backend ⚙️

Backend API for **TeamForge**, a full-stack SaaS project management platform.

This backend powers authentication, workspaces, projects, tasks, subtasks, comments, attachments, invitations, notifications, activity logs, search, and realtime collaboration features.
It also includes billing, an AI assistant endpoint, and direct member-to-member project chat.

---

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Socket.IO
- Cloudinary
- Multer
- Nodemailer
- Mailgen
- Razorpay

---

## Backend Responsibilities

- Authentication and authorization
- Refresh token rotation
- Email verification and password recovery
- Workspace management
- Project management
- Task and subtask operations
- Task comments and attachments
- Workspace and project invitations
- Notifications
- Activity logs
- Global search
- Realtime chat and events
- Direct project chat
- Billing and subscription flow
- AI assistant support

---

## Security Features

- Helmet
- Rate limiting
- Cookie parsing
- CORS configuration
- Mongo sanitization
- HPP protection
- JWT verification middleware
- Role-based permission checks

---

## Folder Structure

```bash
backend/
│
├── src/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── validators/
│   └── index.js
│
├── package.json
├── .env.example
└── README.md
```

---

## Environment Setup

Create a .env file in the backend folder based on .env.example.

## Core Modules

- Auth
- Workspaces
- Workspace Members
- Workspace Invitations
- Projects
- Project Members
- Project Invitations
- Tasks
- Subtasks
- Task Comments
- Attachments
- Notifications
- Activity Logs
- Search
- Chat

## API Notes

- All main routes are versioned under `/api/v1`
- JWT-based protected routes use authorization middleware
- File uploads support task attachments through Multer + Cloudinary
- Realtime updates are emitted through Socket.IO events
- Activity logs and notifications are created for major collaboration actions
- Billing flows use Razorpay order creation and verification
- AI assistant queries are served from a protected API route

## Current Status

### Completed

- Auth system
- Workspace module
- Project module
- Task module
- Subtasks
- Comments
- Attachments
- Notifications
- Activity logs
- Search
- Chat
- Direct chat
- Billing flow
- AI assistant
- Invitation flows

### In Progress

- Refactoring and cleanup
- Deployment readiness
- Testing support
- Additional production improvements

## Author

**Yash Redkar**
