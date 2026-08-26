const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://ljcczzlbjzoouwcxxary.supabase.co/storage/v1/object/public/balance-wheel/index.html';

// ============================================================
// /start — welcome + open Mini App button
// ============================================================
bot.start(async (ctx) => {
  const userName = ctx.from.first_name || 'there';
  await ctx.reply(
    `Привет, ${userName}! 👋\n\n` +
    `Это *Колесо Баланса* — твой личный трекер жизненных сфер.\n\n` +
    `Нажми кнопку ниже, чтобы открыть приложение и начать отслеживать свой баланс каждый день.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🌀 Открыть колесо баланса', MINI_APP_URL)],
      ]),
    }
  );
});

// ============================================================
// /open — quick access to Mini App
// ============================================================
bot.command('open', async (ctx) => {
  await ctx.reply('Открываю колесо баланса...', {
    ...Markup.inlineKeyboard([
      [Markup.button.webApp('🌀 Колесо баланса', MINI_APP_URL)],
    ]),
  });
});

// ============================================================
// /help
// ============================================================
bot.command('help', async (ctx) => {
  await ctx.reply(
    `*Колесо Баланса*\n\n` +
    `Команды:\n` +
    `/start — приветствие и кнопка запуска\n` +
    `/open — открыть Mini App\n` +
    `/help — эта справка\n\n` +
    `Каждый день открывай приложение и оценивай свои сферы жизни от 0 до 10.`,
    { parse_mode: 'Markdown' }
  );
});

bot.launch().then(() => {
  console.log('🤖 Balance Wheel bot is running...');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
