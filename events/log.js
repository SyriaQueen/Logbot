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
            // جلب جميع المرفقات
            const attachments = [];
            for (const attachment of message.attachments.values()) {
                try {
                    const response = await fetch(attachment.proxyURL);
                    const buffer = await response.buffer();
                    attachments.push({
                        name: attachment.name,
                        data: buffer,
                        type: getFileType(attachment.name),
                        size: attachment.size
                    });
                } catch (error) {
                    console.error(`فشل تحميل المرفق: ${attachment.name}`, error);
                }
            }

            if (attachments.length === 0) return;

            // تصنيف المرفقات
            const images = attachments.filter(a => a.type.name === 'صورة');
            const videos = attachments.filter(a => a.type.name === 'فيديو');
            const documents = attachments.filter(a => a.type.name === 'مستند');
            const others = attachments.filter(a => 
                !['صورة', 'فيديو', 'مستند'].includes(a.type.name)
            );

            // الإمبد الرئيسي
            const mainEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🗑️ تم حذف مرفقات')
                .setDescription(`**المستخدم:** ${message.author.tag}\n**القناة:** ${message.channel}`)
                .setTimestamp()
                .setFooter({ text: 'سجل الحذف', iconURL: message.author.displayAvatarURL() });

            await logChannel.send({ embeds: [mainEmbed] });

            // إرسال الصور
            for (const img of images) {
                const imgEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🖼️ صورة محذوفة')
                    .addFields(
                        { name: 'الاسم', value: img.name, inline: true },
                        { name: 'النوع', value: img.type.name, inline: true },
                        { name: 'الحجم', value: formatBytes(img.size), inline: true }
                    )
                    .setImage(`attachment://${img.name}`)
                    .setTimestamp();

                await logChannel.send({
                    embeds: [imgEmbed],
                    files: [{ attachment: img.data, name: img.name }]
                });
            }

            // إرسال الفيديوهات
            for (const video of videos) {
                const videoEmbed = new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle('🎬 فيديو محذوف')
                    .addFields(
                        { name: 'الاسم', value: video.name, inline: true },
                        { name: 'النوع', value: video.type.name, inline: true },
                        { name: 'الحجم', value: formatBytes(video.size), inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({
                    embeds: [videoEmbed],
                    files: [{ attachment: video.data, name: video.name }]
                });
            }

            // إرسال إمبدات المستندات والملفات العامة
            if (documents.length > 0) {
                const docEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('📄 مستندات محذوفة')
                    .setDescription(`**عدد المستندات:** ${documents.length}`)
                    .setTimestamp();

                await logChannel.send({ embeds: [docEmbed] });
            }

            if (others.length > 0) {
                const otherEmbed = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('📁 ملفات عامة محذوفة')
                    .setDescription(`**عدد الملفات:** ${others.length}`)
                    .setTimestamp();

                await logChannel.send({ embeds: [otherEmbed] });
            }

            // إرسال جميع الملفات بعد الإمبدتات
            const allFiles = [...documents, ...others];
            for (const file of allFiles) {
                await logChannel.send({
                    files: [{ attachment: file.data, name: file.name }]
                });
            }

        } catch (error) {
            console.error('فشل إرسال السجل:', error);
        }
    });
};

// دالة تحديد نوع الملف
function getFileType(filename) {
    const ext = (filename.split('.').pop() || 'unknown').toLowerCase();
    const types = {
        image: { 
            exts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'],
            name: 'صورة',
            icon: '🖼️'
        },
        video: {
            exts: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'],
            name: 'فيديو',
            icon: '🎬'
        },
        document: {
            exts: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'rtf'],
            name: 'مستند',
            icon: '📄'
        },
        audio: {
            exts: ['mp3', 'wav', 'ogg', 'm4a'],
            name: 'صوت',
            icon: '🎵'
        },
        archive: {
            exts: ['zip', 'rar', '7z', 'tar', 'gz'],
            name: 'أرشيف',
            icon: '📦'
        }
    };

    for (const [key, type] of Object.entries(types)) {
        if (type.exts.includes(ext)) return { ...type, ext };
    }
    return { name: 'ملف عام', icon: '📁', ext };
}

// دالة تنسيق الحجم
function formatBytes(bytes) {
    const units = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    if (bytes === 0) return '0 بايت';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}
