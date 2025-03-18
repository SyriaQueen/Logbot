const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
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

// 🗑️ تسجيل حذف الملفات مع تحديد النوع والامتداد داخل Embed
client.on("messageDelete", async (message) => {
  if (!message.attachments.size) return; // إذا لم يكن هناك ملفات مرفقة، لا تفعل شيئًا

  const logChannel = client.channels.cache.get(config.LOG_CHANNEL_ID);
  if (!logChannel) return;

  try {
    let filesInfo = [];

    message.attachments.forEach((attachment) => {
      const fileUrl = attachment.url;
      const fileName = attachment.name || "غير معروف";
      const fileExtension = fileName.split(".").pop().toLowerCase();

      let fileType = "📄 ملف عام";
      if (["png", "jpg", "jpeg", "gif", "webp"].includes(fileExtension)) {
        fileType = "🖼️ صورة";
      } else if (["mp4", "mov", "avi", "mkv", "webm"].includes(fileExtension)) {
        fileType = "🎥 فيديو";
      }

      filesInfo.push(`**${fileType} (${fileExtension})**\n📎 [رابط الملف](${fileUrl})`);
    });

    // إنشاء Embed بتصميم أنيق
    const embed = new EmbedBuilder()
      .setColor("#FF0000") // لون أحمر للدلالة على الحذف
      .setTitle("🗑️ تم حذف ملفات")
      .setDescription(`**المستخدم:** ${message.author.tag}\n**القناة:** ${message.channel}`)
      .addFields({ name: "📂 الملفات:", value: filesInfo.join("\n") })
      .setTimestamp()
      .setFooter({ text: "تم تسجيل الحذف", iconURL: message.author.displayAvatarURL() });

    // إرسال السجل داخل Embed
    logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error("❌ فشل إرسال السجل:", error);
    logChannel.send(`⚠️ **خطأ:** لم يتمكن البوت من إرسال سجل الحذف لـ **${message.author.tag}**.`);
  }
});

// ⏳ منع الخمول عبر طباعة في الكونسول كل 5 دقائق
setInterval(() => {
  console.log("✅ البوت لا يزال يعمل...");
}, 5 * 60 * 1000); // 5 دقائق

client.login(config.TOKEN);
