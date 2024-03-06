const express = require('express');
const { Telegraf } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();
require('dotenv').config();
const bot = new Telegraf(process.env.BOT_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const port = process.env.PORT || 3000;

// Daftar pengguna yang diizinkan (selain pemilik bot)
const allowedUsers = [5615921474, 1620434318];

// Fungsi untuk mengubah file lokal menjadi GoogleGenerativeAI.Part
async function fileToGenerativePart(path, mimeType) {
  const response = await fetch(path);
  const fileBuffer = await response.arrayBuffer();
  return {
    inlineData: {
      data: Buffer.from(fileBuffer).toString('base64'),
      mimeType,
    },
  };
}

// Fungsi untuk menjalankan model Gemini dengan prompt dan model
async function runGemini(prompt, model, imagePath = null) {
  const genAImodel = genAI.getGenerativeModel({ model });
  if (model === 'gemini-pro') {
    const result = await genAImodel.generateContent(prompt);
    const message = await result.response.text();
    return message;
  } else {
    const part = await fileToGenerativePart(imagePath, 'image/jpeg');
    const result = await genAImodel.generateContent([prompt, part]);
    const response = await result.response;
    const text = response.text();
    return text;
  }
}

// Handler untuk pesan teks
bot.on('text', async (ctx) => {
  const message = ctx.message.text;

  // Pastikan pesan dimulai dengan /ask
  if (!message.startsWith('/ask')) return;

  // Pisahkan teks prompt dari perintah
  const prompt = message.substring(5);

  // Periksa akses pengguna
  if (!allowedUsers.includes(ctx.from.id) && ctx.from.id !== process.env.OWNER_ID) {
    ctx.reply('Anda tidak diizinkan menggunakan bot ini.');
    return;
  }

  ctx.replyWithChatAction('typing');
  const response = await runGemini(prompt, 'gemini-pro');
  ctx.reply(response);
});

// Handler untuk pesan foto
bot.on('photo', async (ctx) => {
  const photo = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  ctx.replyWithChatAction('typing');
  const prompt = ctx.message.caption;
  const file = await ctx.telegram.getFileLink(photo);
  const response = await runGemini(prompt, 'gemini-pro-vision', file.href);
  ctx.reply(response);
});

// Handler untuk error
bot.catch((err, ctx) => {
  ctx.reply(err.message);
});

// Jalankan bot
bot.launch();

// Server Express sederhana
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`App listening at ${port}`);
});
