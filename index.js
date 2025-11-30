const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ==============================
// WEBHOOK VERIFICATION
// ==============================
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
});

// ==============================
// HANDLE INCOMING MESSAGES
// ==============================
app.post("/webhook", async (req, res) => {
    console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));

    try {
        const data = req.body;

        if (
            data.object &&
            data.entry &&
            data.entry[0].changes &&
            data.entry[0].changes[0].value.messages
        ) {
            const message = data.entry[0].changes[0].value.messages[0];
            const from = message.from;
            const text = message.text?.body || "";

            const reply = generateReply(text);
            await sendMessage(from, reply);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("Error handling webhook:", error);
        res.sendStatus(500);
    }
});

// ==============================
// AUTO REPLY LOGIC
// ==============================
function generateReply(text) {
    const lower = text.toLowerCase();

    // Kiswahili keywords
    const swahiliWords = ["habari", "bei", "huduma", "ulipo", "wapi", "mambo", "msaada"];
    const isSwahili = swahiliWords.some(w => lower.includes(w));

    // Greetings
    if (lower.includes("hello") || lower.includes("hi") || lower.includes("habari")) {
        return isSwahili
            ? "Habari 👋, naweza kukusaidia vipi leo?"
            : "Hello 👋, how can I help you today?";
    }

    // Price
    if (lower.includes("bei") || lower.includes("price")) {
        return isSwahili
            ? "Bei zetu zinategemea huduma. Tafadhali taja huduma unayohitaji."
            : "Our prices depend on the service. Please tell me which service you need.";
    }

    // Services
    if (lower.includes("huduma") || lower.includes("services") || lower.includes("service")) {
        return isSwahili
            ? "Tunatoa huduma: websites, graphics, vyeti, usajili wa biashara na nyinginezo."
            : "We offer services like websites, graphics, certificates, business registration and more.";
    }

    // Location
    if (lower.includes("ulipo") || lower.includes("wapi") || lower.includes("location")) {
        return isSwahili
            ? "Tupo Tanzania 🇹🇿. Wasiliana nasi kwa maelekezo zaidi."
            : "We are located in Tanzania 🇹🇿. Contact us for directions.";
    }

    // Default
    return isSwahili
        ? "Asante kwa ujumbe wako 😊. Nakusaidiaje?"
        : "Thank you for your message 😊. How can I assist you?";
}

// ==============================
// SEND MESSAGE TO WHATSAPP
// ==============================
async function sendMessage(to, message) {
    const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

    await axios.post(
        url,
        {
            messaging_product: "whatsapp",
            to,
            text: { body: message }
        },
        {
            headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json"
            }
        }
    );
}

// ==============================
// START SERVER
// ==============================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log("🚀 Bot running on port " + PORT);
});
