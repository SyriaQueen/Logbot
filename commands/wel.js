const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');
const fetch = require('node-fetch');

module.exports = {
    name: 'صورة',
    async execute(message, args, client) {
        try {
            // إعداداتك الخاصة
            const settings = {
                avatar: {
                    width: 183, // 182.9789217053284
                    height: 179, // 178.6167939136292
                    left: 34, // 34.25
                    top: 71 // 71.29
                },
                background: {
                    width: 350,
                    height: 350,
                    color: '#ffffff00' // شفافية
                }
            };

            // 1. الحصول على أفاتار المرسل
            const user = message.author;
            const avatarURL = user.displayAvatarURL({ 
                extension: 'png', 
                size: 4096 
            });

            // 2. تحميل الأفاتار
            const response = await fetch(avatarURL);
            const avatarBuffer = await response.buffer();

            // 3. معالجة الأفاتار
            const processedAvatar = await sharp(avatarBuffer)
                .resize(settings.avatar.width, settings.avatar.height, {
                    fit: 'cover',
                    position: 'centre'
                })
                .toBuffer();

            // 4. إنشاء خلفية مخصصة
            const background = await sharp({
                create: {
                    width: settings.background.width,
                    height: settings.background.height,
                    channels: 4,
                    background: sharp.color(settings.background.color)
                }
            }).png().toBuffer();

            // 5. دمج الأفاتار مع الخلفية
            const compositeImage = await sharp(background)
                .composite([{
                    input: processedAvatar,
                    left: settings.avatar.left,
                    top: settings.avatar.top
                }])
                .png()
                .toBuffer();

            // 6. تطبيق القص الدائري
            const circularImage = await sharp(compositeImage)
                .composite([{
                    input: Buffer.from(
                        `<svg width="${settings.avatar.width}" height="${settings.avatar.height}">
                            <circle cx="${settings.avatar.width/2}" 
                                    cy="${settings.avatar.height/2}" 
                                    r="${Math.min(settings.avatar.width, settings.avatar.height)/2}" 
                                    fill="black"/>
                        </svg>`
                    ),
                    blend: 'dest-in',
                    left: settings.avatar.left,
                    top: settings.avatar.top
                }])
                .png()
                .toBuffer();

            // 7. إرسال النتيجة
            const attachment = new AttachmentBuilder(circularImage, {
                name: 'custom_avatar.png'
            });

            await message.reply({
                content: '🖼️ صورتك المخصصة:',
                files: [attachment]
            });

        } catch (error) {
            console.error('حدث خطأ تقني:', error);
            message.reply('❌ فشل في توليد الصورة، يرجى المحاولة لاحقاً');
        }
    }
};
