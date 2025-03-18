const { Client, GatewayIntentBits } = require("discord.js");
const config = require("./config.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ البوت يعمل الآن باسم: ${client.user.tag}`);
});

// 🗑️ تسجيل حذف الصور والفيديوهات ورفعها إلى القناة عبر روابط Discord
client.on("messageDelete", async (message) => {
  if (!message.attachments.size) return; // إذا لم يكن هناك ملفات مرفقة، لا تفعل شيئًا

  const logChannel = client.channels.cache.get(config.LOG_CHANNEL_ID);
  if (!logChannel) return;

  message.attachments.forEach(async (attachment) => {
    try {
      // الحصول على الرابط المباشر للملف
      const fileUrl = attachment.url;

      // إرسال الرابط إلى القناة المحددة
      logChannel.send({
        content: `🗑 **${message.author.tag}** حذف ملف في ${message.channel}:\n📎 ${fileUrl}`
      });
    } catch (error) {
      console.error("❌ فشل إرسال الملف:", error);
      logChannel.send(`⚠️ **خطأ:** لم يتمكن البوت من إرسال ملف حذفه **${message.author.tag}**.`);
    }
  });
});

// ⏳ منع الخمول عبر طباعة في الكونسول كل 5 دقائق
setInterval(() => {
  console.log("✅ البوت لا يزال يعمل...");
}, 5 * 60 * 1000); // 5 دقائق

client.login(config.TOKEN);
