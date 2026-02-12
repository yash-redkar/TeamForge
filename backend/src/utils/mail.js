import Mailgen from "mailgen";
import nodemailer from "nodemailer"

const sendEmail = async(options) => {
    const mailGenerator = new Mailgen({
        theme: "default",
        product: {
            name: "Task Manager",
            link:"https://taskmanagerlink.com"
        }
    })

    const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent)
    const emailHtml = mailGenerator.generate(options.mailgenContent)

    const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_SMTP_HOST,
        port: process.env.MAILTRAP_SMTP_PORT,
        auth: {
            user: process.env.MAILTRAP_SMTP_USER,
            pass: process.env.MAILTRAP_SMTP_PASS,
        },
    });

    const mail = {
        from: "mail.taskmanager@example.com",
        to:options.email,
        subject: options.subject,
        text:emailTextual,
        html: emailHtml
    }

    try {
        await transporter.sendMail(mail)
    } catch (error) {
    console.error("Email service failed:", error);
    throw error; 
}
}

const emailVerificationMailgenContent = (username,verificationUrl) => {
    return {
        body: {
            name: username,
            intro: "Welcome to your App! we are excited to have you on board.",
            action: {
                instructions:
                    "To verify your email please click on the following button",
                button: {
                    color: "#10B981",
                    text: "Verify your email",
                    link: verificationUrl,
                },
            },
            outro: "Need help, or have questions? Just reply to this email, we would love to help.",
        },
    };
}

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
    return {
        body: {
            name: username,
            intro: "We received a request to reset your password. No worries — we’ve got you covered!",
            action: {
                instructions:
                    "Click the button below to securely reset your password:",
                button: {
                    color: "#3f9edaff",
                    text: "Reset My Password",
                    link: passwordResetUrl,
                },
            },
            outro: "If you did not request a password reset, please ignore this email. Your account will remain secure.",
        },
    };
};

export{
    emailVerificationMailgenContent,
    forgotPasswordMailgenContent,
    sendEmail
}
