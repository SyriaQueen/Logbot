const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../config.js');

module.exports = (client) => {
    const processedMessages = new Set();

    client.on('messageDelete', async (message) => {
        if (processedMessages.has(message.id)) return;
        processedMessages.add(message.id);
        setTimeout(() => processedMessages.delete(message.id), 60000);

        if (!message.attachments.size || message.author?.bot) return;

        const logChannel = client.channels.cache.get(config.LOG_CHANNEL_ID);
        if (!logChannel) return;

        try {
            // تحميل المرفقات
            const attachments = [];
            for (const attachment of message.attachments.values()) {
                try {
                    const response = await fetch(attachment.proxyURL);
                    if (!response.ok) throw new Error('Failed to fetch');
                    const buffer = await response.buffer();
                    attachments.push({
                        name: attachment.name,
                        data: buffer,
                        type: getFileType(attachment.name)
                    });
                } catch (error) {
                    console.error(`فشل تحميل المرفق: ${attachment.name}`, error);
                }
            }

            if (attachments.length === 0) return;

            // تصنيف المرفقات
            const images = attachments.filter(a => a.type.name === 'صورة');
            const videos = attachments.filter(a => a.type.name === 'فيديو');
            const others = attachments.filter(a => !['صورة', 'فيديو'].includes(a.type.name));

            // إرسال الصور
            if (images.length > 0) {
                for (const [index, img] of images.entries()) {
                    const embed = new EmbedBuilder()
                        .setColor(index === 0 ? '#FF0000' : '#FFA500')
                        .setTitle(index === 0 ? '🗑️ تم حذف ملفات' : '🖼️ صورة إضافية محذوفة')
                        .setDescription(
                            `**المستخدم:** ${message.author.tag}\n` +
                            `**القناة:** ${message.channel}\n` +
                            (index === 0 ? '' : `**الإمتداد:** .${img.type.ext}`)
                        )
                        .setImage(`attachment://${img.name}`)
                        .setTimestamp()
                        .setFooter({ 
                            text: index === 0 ? 'تم تسجيل الحذف' : 'صورة إضافية',
                            iconURL: message.author.displayAvatarURL()
                        });

                    if (index === 0) {
                        embed.addFields({
                            name: '🖼️ معلومات الملف',
                            value: `**النوع:** ${img.type.name}\n**الإمتداد:** .${img.type.ext}`
                        });
                    }

                    await logChannel.send({
                        embeds: [embed],
                        files: [{ attachment: img.data, name: img.name }]
                    });
                }
            }

            // إرسال الفيديوهات والملفات الأخرى
            const otherFiles = [...videos, ...others];
            if (otherFiles.length > 0) {
                const files = otherFiles.map(f => ({ 
                    attachment: f.data, 
                    name: f.name 
                }));

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('📁 ملفات إضافية محذوفة')
                    .setDescription(`**المستخدم:** ${message.author.tag}\n**القناة:** ${message.channel}`)
                    .addFields(
                        otherFiles.map(f => ({
                            name: `${f.type.icon} ${f.type.name}`,
                            value: `**الاسم:** ${f.name}\n**النوع:** ${f.type.name}\n**الإمتداد:** .${f.type.ext}`,
                            inline: true
                        }))
                    )
                    .setTimestamp();

                await logChannel.send({ 
                    embeds: [embed],
                    files: files.slice(0, 10) // الحد الأقصى للمرفقات
                });

                // إرسال الملفات المتبقية إذا تجاوزت الحد
                for (let i = 10; i < files.length; i += 10) {
                    await logChannel.send({
                        files: files.slice(i, i + 10)
                    });
                }
            }
        } catch (error) {
            console.error('❌ فشل إرسال السجل:', error);
        }
    });
};

function getFileType(filename) {
    const ext = (filename.split('.').pop() || 'unknown').toLowerCase();
    const types = {
        image: { 
            exts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'],
            name: 'صورة',
            icon: '🖼️'
        },
        video: {
            exts: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'],
            name: 'فيديو',
            icon: '🎬'
        },
        document: {
            exts: ['pdf', 'docx', 'txt', 'xlsx', 'pptx'],
            name: 'مستند',
            icon: '📄'
        },
        audio: {
            exts: ['mp3', 'wav', 'ogg'],
            name: 'صوت',
            icon: '🎵'
        },
        archive: {
            exts: ['zip', 'rar', '7z'],
            name: 'أرشيف',
            icon: '📦'
        },
        default: {
            name: 'ملف عام',
            icon: '📁'
        }
    };

    for (const type of Object.values(types)) {
        if (type.exts && type.exts.includes(ext)) {
            return { ...type, ext };
        }
    }
    return { ...types.default, ext };
}
