const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const config = require("./config.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🔄 مجموعة لتتبع الرسائل المحذوفة المكررة
const processedMessages = new Set();

client.once("ready", () => {
  console.log(`✅ البوت يعمل الآن باسم: ${client.user.tag}`);
});

// 🗑️ معالجة حذف الملفات مع تحسينات
client.on("messageDelete", async (message) => {
  // منع المعالجة المكررة
  if (processedMessages.has(message.id)) return;
  processedMessages.add(message.id);
  
  // تنظيف الذاكرة بعد فترة
  setTimeout(() => processedMessages.delete(message.id), 60000);

  if (!message.attachments.size) return;
  if (message.author?.bot) return; // تجاهل رسائل البوتات

  const logChannel = client.channels.cache.get(config.LOG_CHANNEL_ID);
  if (!logChannel) return;

  try {
    const filesInfo = [];
    
    // 🗂️ تصنيف الملفات
    message.attachments.forEach(attachment => {
      const fileType = getFileType(attachment.name);
      filesInfo.push(`**${fileType.icon} ${fileType.name} (${fileType.ext})**\n📎 [${attachment.name}](${attachment.url})`);
    });

    // 📨 إرسال الإيمبد مع تقسيم المحتوى الطويل
    const embed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("🗑️ تم حذف ملفات")
      .setDescription(`**المستخدم:** ${message.author.tag}\n**القناة:** ${message.channel}`)
      .setTimestamp()
      .setFooter({
        text: "تم تسجيل الحذف",
        iconURL: message.author.displayAvatarURL()
      });

    // ✂️ تقسيم الحقول عند الضرورة
    splitFields(filesInfo, embed);
    
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error("❌ فشل إرسال السجل:", error);
  }
});

// 🗄️ دالة لتصنيف أنواع الملفات
function getFileType(filename) {
  const ext = (filename.split('.').pop() || 'unknown').toLowerCase();
  const types = {
    image: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
    video: ['mp4', 'mov', 'avi', 'mkv', 'webm']
  };

  return {
    icon: types.image.includes(ext) ? '🖼️' : 
          types.video.includes(ext) ? '🎥' : '📄',
    name: types.image.includes(ext) ? 'صورة' : 
          types.video.includes(ext) ? 'فيديو' : 'ملف عام',
    ext
  };
}

// 📦 دالة لتقسيم الحقول الطويلة
function splitFields(content, embed) {
  const MAX_LENGTH = 1024;
  let currentChunk = [];
  let currentLength = 0;

  content.forEach(item => {
    if (currentLength + item.length > MAX_LENGTH) {
      embed.addFields({ 
        name: "📂 الملفات (جزء 1)", 
        value: currentChunk.join('\n') 
      });
      currentChunk = [];
      currentLength = 0;
    }
    currentChunk.push(item);
    currentLength += item.length;
  });

  if (currentChunk.length > 0) {
    embed.addFields({ 
      name: `📂 الملفات${content.length > 1 ? ' (جزء أخير)' : ''}`, 
      value: currentChunk.join('\n') 
    });
  }
}

// ⏳ منع الخمول
setInterval(() => {
  console.log("🔄 البوت نشط...", new Date().toLocaleString());
}, 300000);

client.login(config.TOKEN);
