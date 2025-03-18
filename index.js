const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const config = require("./config.js");
const express = require('express');

const app = express();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const processedMessages = new Set();

// تشغيل السيرفر لمنع الخمول
app.listen(10000, () => {
  console.log('✅ السيرفر يعمل على المنفذ 10000');
});

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
    const { images, videos, others } = categorizeAttachments(message.attachments);

    // إنشاء الأمبيد الرئيسي
    const mainEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setTitle("🗑️ تم حذف ملفات")
      .setDescription(`**المستخدم:** ${message.author.tag}\n**القناة:** ${message.channel}`)
      .setTimestamp()
      .setFooter({ text: "تم تسجيل الحذف", iconURL: message.author.displayAvatarURL() });

    // إضافة أول صورة إن وجدت
    if (images.length > 0) {
      mainEmbed.setImage(images[0].url);
      images.shift(); // إزالة الصورة الأولى من المصفوفة
    }

    // إضافة الملفات الأخرى
    addFieldsToEmbed(mainEmbed, others);

    // إرسال الأمبيد الرئيسي
    await logChannel.send({ embeds: [mainEmbed] });

    // إرسال الصور الإضافية كأمبيدات منفصلة
    if (images.length > 0) {
      for (const image of images) {
        const imageEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("🖼️ صورة إضافية محذوفة")
          .setDescription(`**المستخدم:** ${message.author.tag}\n**القناة:** ${message.channel}`)
          .setImage(image.url)
          .setTimestamp()
          .setFooter({ text: "تم تسجيل الحذف", iconURL: message.author.displayAvatarURL() });
        
        await logChannel.send({ embeds: [imageEmbed] });
      }
    }

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

// دالة معدلة لإضافة الحقول (الملفات الأخرى فقط)
function addFieldsToEmbed(embed, others) {
  if (others.length > 0) {
    const fieldValue = others.map(a => `[${a.name}](${a.url})`).join('\n');
    embed.addFields({
      name: "📁 ملفات أخرى",
      value: fieldValue.length > 1024 ? fieldValue.slice(0, 1000) + "..." : fieldValue
    });
  }
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

client.login(config.TOKEN);
