const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const config = require("./config.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const processedMessages = new Set();

client.once("ready", () => {
  console.log(`✅ البوت يعمل الآن باسم: ${client.user.tag}`);
});

client.on("messageDelete", async (message) => {
  if (processedMessages.has(message.id)) return;
  processedMessages.add(message.id);
  setTimeout(() => processedMessages.delete(message.id), 60000);

  if (!message.attachments.size) return;
  if (message.author?.bot) return;

  const logChannel = client.channels.cache.get(config.LOG_CHANNEL_ID);
  if (!logChannel) return;

  try {
    // فصل الملفات إلى أنواع
    const { images, videos, others } = categorizeAttachments(message.attachments);

    // إنشاء الأمبيد الأساسي
    const embed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("🗑️ تم حذف ملفات")
      .setDescription(`**المستخدم:** ${message.author.tag}\n**القناة:** ${message.channel}`)
      .setTimestamp()
      .setFooter({ text: "تم تسجيل الحذف", iconURL: message.author.displayAvatarURL() });

    // إضافة أول صورة للأمبيد
    if (images.length > 0) {
      embed.setImage(images[0].url);
      images.shift(); // إزالة الصورة الأولى التي تم استخدامها
    }

    // إضافة الحقول المتبقية
    addFieldsToEmbed(embed, images, videos, others);

    // إرسال الأمبيد
    const sentMessage = await logChannel.send({ embeds: [embed] });

    // إرسال الفيديوهات كرسائل منفصلة
    if (videos.length > 0) {
      await sendVideosSeparately(logChannel, videos);
    }

  } catch (error) {
    console.error("❌ فشل إرسال السجل:", error);
  }
});

// دالة لتصنيف المرفقات
function categorizeAttachments(attachments) {
  const result = { images: [], videos: [], others: [] };
  
  attachments.forEach(attachment => {
    const type = getFileType(attachment.name);
    if (type.name === 'صورة') result.images.push(attachment);
    else if (type.name === 'فيديو') result.videos.push(attachment);
    else result.others.push(attachment);
  });
  
  return result;
}

// دالة لإضافة الحقول للأمبيد
function addFieldsToEmbed(embed, images, videos, others) {
  const fields = [];
  
  if (images.length > 0) {
    fields.push({
      name: "🖼️ الصور الإضافية",
      value: images.map(a => `[${a.name}](${a.url})`).join('\n')
    });
  }
  
  if (others.length > 0) {
    fields.push({
      name: "📁 ملفات أخرى",
      value: others.map(a => `[${a.name}](${a.url})`).join('\n')
    });
  }

  // إضافة الحقول مع مراعاة الحد الأقصى للأحرف
  fields.forEach(field => {
    if (field.value.length > 1024) {
      field.value = field.value.slice(0, 1000) + "... (راجع السجلات الكاملة)";
    }
    embed.addFields(field);
  });
}

// دالة لإرسال الفيديوهات بشكل منفصل
async function sendVideosSeparately(channel, videos) {
  try {
    const videoLinks = videos.map(v => `🎥 **فيديو:** [${v.name}](${v.url})`);
    const content = `**الفيديوهات المحذوفة:**\n${videoLinks.join('\n')}`;
    
    if (content.length > 2000) {
      const chunks = chunkContent(content, 2000);
      for (const chunk of chunks) {
        await channel.send(chunk);
      }
    } else {
      await channel.send(content);
    }
  } catch (error) {
    console.error("❌ فشل إرسال الفيديوهات:", error);
  }
}

// دوال مساعدة
function getFileType(filename) {
  const ext = (filename.split('.').pop() || 'unknown').toLowerCase();
  const types = {
    image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'],
    video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv']
  };
  
  return {
    name: types.image.includes(ext) ? 'صورة' : 
          types.video.includes(ext) ? 'فيديو' : 'ملف عام',
    ext
  };
}

function chunkContent(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.substring(i, i + size));
  }
  return chunks;
}

// منع الخمول
setInterval(() => {
  console.log("🔄 حالة البوت: نشط", new Date().toLocaleString());
}, 300000);

client.login(config.TOKEN);
