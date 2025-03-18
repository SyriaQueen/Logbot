const { Client, GatewayIntentBits } = require("discord.js");
const config = require("./config.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`✅ البوت يعمل الآن باسم: ${client.user.tag}`);
});

// 🗑️ تسجيل حذف الصور ورفعها إلى القناة عبر روابط Discord
client.on("messageDelete", async (message) => {
  if (!message.attachments.size) return; // إذا لم يكن هناك صور، لا تفعل شيئًا

  const logChannel = client.channels.cache.get(config.LOG_CHANNEL_ID);
  if (!logChannel) return;

  message.attachments.forEach(async (attachment) => {
    if (!attachment.contentType.startsWith("image")) return; // تجاهل أي ملف ليس صورة

    try {
      // الحصول على الرابط المباشر للصورة من Discord
      const imageUrl = attachment.url;

      // إرسال الرابط إلى القناة المحددة
      logChannel.send({
        content: `🗑 **${message.author.tag}** حذف صورة في ${message.channel}:\n📎 ${imageUrl}`,
      });
    } catch (error) {
      console.error("❌ فشل إرسال الصورة:", error);
      logChannel.send(`⚠️ **خطأ:** لم يتمكن البوت من إرسال صورة حذفها **${message.author.tag}**.`);
    }
  });
});

// ⏳ منع الخمول عبر طباعة في الكونسول كل 5 دقائق
setInterval(() => {
  console.log("✅ البوت لا يزال يعمل...");
}, 5 * 60 * 1000); // 5 دقائق

client.login(config.TOKEN);
