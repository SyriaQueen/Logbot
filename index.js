const { Client, GatewayIntentBits, EmbedBuilder, Partials } = require("discord.js");
const express = require("express");
const config = require("./config.js");

// تشغيل خادم ويب على المنفذ 10000
const webServer = express();
webServer.listen(10000, () => {
  console.log("🖥️ الخادم يعمل على المنفذ 10000");
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message]
});

const processedMessages = new Set();

client.once("ready", () => {
  console.log(`✅ البوت يعمل باسم: ${client.user.tag}`);
});

client.on("messageDelete", async (message) => {
  try {
    if (message.partial) await message.fetch().catch(() => {});
    if (!message.attachments?.size || message.author?.bot) return;
    
    const msgId = message.id;
    if (processedMessages.has(msgId)) return;
    
    processedMessages.add(msgId);
    setTimeout(() => processedMessages.delete(msgId), 120000);

    const logChannel = client.channels.cache.get(config.LOG_CHANNEL_ID);
    if (!logChannel) return;

    // تصنيف المرفقات
    const { images, videos, others } = categorizeAttachments(message.attachments);
    
    // إنشاء وإرسال الأمبيد الرئيسي
    const mainEmbed = createMainEmbed(message, images, msgId);
    await logChannel.send({ embeds: [mainEmbed] });

    // إرسال الصور الإضافية في أمبيدات منفصلة
    if (images.length > 0) {
      for (const img of images) {
        const imgEmbed = new EmbedBuilder()
          .setColor("#FF5555")
          .setImage(img.url)
          .setFooter({ text: `ID: ${msgId}` });
        await logChannel.send({ embeds: [imgEmbed] });
      }
    }

    // إرسال الفيديوهات مع التحقق من التكرار
    if (videos.length > 0) {
      await sendVideosWithCheck(logChannel, videos, msgId);
    }

    // إرسال الملفات الأخرى
    if (others.length > 0) {
      const othersEmbed = createOthersEmbed(others, msgId);
      await logChannel.send({ embeds: [othersEmbed] });
    }

  } catch (error) {
    console.error("❌ خطأ:", error);
  }
});

// ========== الدوال المساعدة ========== //
function categorizeAttachments(attachments) {
  const result = { images: [], videos: [], others: [] };
  
  attachments.forEach(attachment => {
    const type = getFileType(attachment.name);
    if (type === 'image') result.images.push(attachment);
    else if (type === 'video') result.videos.push(attachment);
    else result.others.push(attachment);
  });
  
  return result;
}

function createMainEmbed(message, images, msgId) {
  const embed = new EmbedBuilder()
    .setColor("#FF0000")
    .setTitle("🗑️ حذف ملفات")
    .setDescription(`**المستخدم:** ${message.author.tag}\n**القناة:** ${message.channel}`)
    .setFooter({ text: `ID: ${msgId}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  if (images.length > 0) {
    embed.setImage(images.shift().url);
  }
  return embed;
}

async function sendVideosWithCheck(channel, videos, msgId) {
  try {
    const existing = await channel.messages.fetch({ limit: 15 });
    const exists = existing.some(m => m.content.includes(msgId));
    
    if (!exists) {
      const videoMsg = `🎥 **فيديوهات محذوفة (ID: ${msgId})**\n` +
        videos.map(v => `[${v.name}](${v.url})`).join('\n');
      
      for (const chunk of chunkContent(videoMsg, 2000)) {
        await channel.send(chunk);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error("❌ خطأ الفيديوهات:", error);
  }
}

function createOthersEmbed(others, msgId) {
  return new EmbedBuilder()
    .setColor("#888888")
    .setTitle("📁 ملفات أخرى محذوفة")
    .setDescription(others.map(o => `[${o.name}](${o.url})`).join('\n'))
    .setFooter({ text: `ID: ${msgId}` });
}

function getFileType(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
  return imageExts.includes(ext) ? 'image' : videoExts.includes(ext) ? 'video' : 'other';
}

function chunkContent(text, chunkSize) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

client.login(config.TOKEN);
