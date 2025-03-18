const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const config = require("./config.js");
const express = require('express');


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const processedMessages = new Set();

const app = express();

// تشغيل الخادم على المنفذ 10000
app.get('/', (req, res) => {
    res.send('البوت يعمل!');
});

app.listen(10000, () => {
    console.log('خادم يعمل على المنفذ 10000');
});

// إعداد setInterval للحفاظ على البوت نشطًا
setInterval(() => {
    console.log("البوت يعمل...");
}, 5 * 60 * 1000);

client.once('ready', () => {
    console.log(`تم تسجيل الدخول كـ ${client.user.tag}!`);
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
    const { images, videos, others } = categorizeAttachments(message.attachments);

    // إنشاء الأمبيد الرئيسي
    const mainEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("🗑️ تم حذف ملفات")
      .setDescription(`**المستخدم:** ${message.author.tag}\n**القناة:** ${message.channel}`)
      .setTimestamp()
      .setFooter({ text: "تم تسجيل الحذف", iconURL: message.author.displayAvatarURL() });

    // معالجة الصورة الأولى
    if (images.length > 0) {
      const firstImage = images[0];
      mainEmbed
        .setImage(firstImage.attachment.url)
        .addFields({
          name: "🖼️ معلومات الملف",
          value: `**النوع:** ${firstImage.type.name}\n**الإمتداد:** .${firstImage.type.ext}`
        });
      images.shift();
    }

    // إضافة الملفات الأخرى
    if (others.length > 0) {
      const otherFiles = others.map(f => 
        `[${f.attachment.name}](${f.attachment.url}) ` + 
        `(النوع: ${f.type.name}, الإمتداد: .${f.type.ext})`
      ).join('\n');
      
      mainEmbed.addFields({
        name: "📁 ملفات أخرى",
        value: otherFiles.length > 1024 ? 
          otherFiles.slice(0, 900) + "... (تجاوز الحد الأقصى)" : 
          otherFiles
      });
    }

    // إرسال الأمبيد الرئيسي
    await logChannel.send({ embeds: [mainEmbed] });

    // إرسال الصور الإضافية
    for (const img of images) {
      const imgEmbed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle("🖼️ صورة إضافية محذوفة")
        .setDescription(
          `**المستخدم:** ${message.author.tag}\n` +
          `**القناة:** ${message.channel}\n` +
          `**الإمتداد:** .${img.type.ext}`
        )
        .setImage(img.attachment.url)
        .setTimestamp();
      
      await logChannel.send({ embeds: [imgEmbed] });
    }

    // إرسال الفيديوهات
    if (videos.length > 0) {
      const videoMessages = videos.map(v => 
        `🎬 **فيديو:** [${v.attachment.name}](${v.attachment.url})\n` +
        `▸ النوع: ${v.type.name}\n▸ الإمتداد: .${v.type.ext}`
      );
      
      const content = `**الفيديوهات المحذوفة:**\n${videoMessages.join('\n\n')}`;
      
      if (content.length > 2000) {
        const chunks = chunkContent(content, 2000);
        for (const chunk of chunks) {
          await logChannel.send(chunk);
        }
      } else {
        await logChannel.send(content);
      }
    }

  } catch (error) {
    console.error("❌ فشل إرسال السجل:", error);
  }
});

// ========== الدوال المساعدة ========== //
function categorizeAttachments(attachments) {
  const result = { images: [], videos: [], others: [] };
  
  attachments.forEach(attachment => {
    const type = getFileType(attachment.name);
    const fileData = {
      attachment: attachment,
      type: type
    };
    
    if (type.name === 'صورة') result.images.push(fileData);
    else if (type.name === 'فيديو') result.videos.push(fileData);
    else result.others.push(fileData);
  });
  
  return result;
}

function getFileType(filename) {
  const ext = (filename.split('.').pop() || 'unknown').toLowerCase();
  const categories = {
    image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'],
    video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'],
    document: ['pdf', 'docx', 'txt', 'xlsx', 'pptx'],
    audio: ['mp3', 'wav', 'ogg'],
    archive: ['zip', 'rar', '7z']
  };
  
  const typeName = 
    categories.image.includes(ext) ? 'صورة' :
    categories.video.includes(ext) ? 'فيديو' :
    categories.document.includes(ext) ? 'مستند' :
    categories.audio.includes(ext) ? 'صوت' :
    categories.archive.includes(ext) ? 'أرشيف' :
    'ملف عام';
  
  return { name: typeName, ext };
}

function chunkContent(text, chunkSize) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

client.login(config.TOKEN).catch(err => console.error("❌ فشل تسجيل الدخول:", err));
