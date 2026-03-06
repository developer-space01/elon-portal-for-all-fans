const TelegramBot = require('node-telegram-bot-api');
const pool = require('./db');

let bot;
if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== process.env.ADMIN_CHAT_ID) return;

    const text = msg.text;
    if (!text) return;

    const match = text.match(/^@(\w+)\s+(.+)$/);
    if (match) {
      const username = match[1];
      const replyText = match[2];

      try {
        await pool.query(
          'INSERT INTO messages (username, message, is_from_user) VALUES ($1, $2, $3)',
          [username, replyText, false]
        );

        const { emitToUser } = require('./server');
        if (emitToUser) emitToUser(username, { from: 'admin', message: replyText, timestamp: new Date() });

        await bot.sendMessage(chatId, `✅ Reply sent to @${username}`);
      } catch (err) {
        await bot.sendMessage(chatId, '❌ Failed to send reply.');
      }
    } else {
      await bot.sendMessage(chatId, '❌ Use: @username your message');
    }
  });
}

async function notifyAdmin(userMsg) {
  if (!bot) return;
  const text = `👤 *${userMsg.username}*: ${userMsg.message}\n_${new Date().toLocaleString()}_`;
  await bot.sendMessage(process.env.ADMIN_CHAT_ID, text, { parse_mode: 'Markdown' });
}

module.exports = { bot, notifyAdmin };
