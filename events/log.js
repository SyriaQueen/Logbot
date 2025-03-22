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

            // إضافة أول صورة للإمبد الرئيسي
            if (images.length > 0) {
                mainEmbed
                    .setImage(`attachment://${images[0].name}`)
                    .addFields({
                        name: '🖼️ الملف الرئيسي',
                        value: `**النوع:** ${images[0].type.name}\n**الحجم:** ${formatBytes(images[0].size)}`
                    });
            }

            // إرسال الإمبد الرئيسي مع المرفقات
            await logChannel.send({
                embeds: [mainEmbed],
                files: images.length > 0 ? [{
                    attachment: images[0].data,
                    name: images[0].name
                }] : []
            });

            // إرسال الصور الإضافية
            for (const img of images.slice(1)) {
                const imgEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🖼️ صورة إضافية')
                    .setDescription(`**الإمتداد:** .${img.type.ext}\n**الحجم:** ${formatBytes(img.size)}`)
                    .setImage(`attachment://${img.name}`)
                    .setTimestamp();

                await logChannel.send({
                    embeds: [imgEmbed],
                    files: [{
                        attachment: img.data,
                        name: img.name
                    }]
                });
            }

            // إرسال الفيديوهات بعد الصور
            if (videos.length > 0) {
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
                        files: [{
                            attachment: video.data,
                            name: video.name
                        }]
                    });
                }
            }

            // إرسال المستندات
            if (documents.length > 0) {
                const docEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('📄 مستندات محذوفة')
                    .addFields(
                        documents.map(doc => ({
                            name: `${doc.type.icon} ${doc.name}`,
                            value: `**النوع:** ${doc.type.name}\n**الحجم:** ${formatBytes(doc.size)}`,
                            inline: true
                        }))
                    )
                    .setTimestamp();

                await logChannel.send({
                    embeds: [docEmbed],
                    files: documents.map(d => ({
                        attachment: d.data,
                        name: d.name
                    }))
                });
            }

            // إرسال الملفات الأخرى
            if (others.length > 0) {
                const otherEmbed = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('📁 ملفات أخرى')
                    .addFields(
                        others.map(file => ({
                            name: `${file.type.icon} ${file.type.name}`,
                            value: `**الاسم:** ${file.name}\n**الحجم:** ${formatBytes(file.size)}`,
                            inline: true
                        }))
                    )
                    .setTimestamp();

                await logChannel.send({
                    embeds: [otherEmbed],
                    files: others.map(f => ({
                        attachment: f.data,
                        name: f.name
                    }))
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
        if (type.exts.includes(ext)) {
            return { ...type, ext };
        }
    }
    return { 
        name: 'ملف عام', 
        icon: '📁',
        ext 
    };
}

// دالة تنسيق الحجم
function formatBytes(bytes) {
    const units = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    if (bytes === 0) return '0 بايت';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}
