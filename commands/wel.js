const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');
const fetch = require('node-fetch');

module.exports = {
    name: 'صورة',
    async execute(message, args, client) {
        if (!message.attachments.size) {
            return message.reply('❌ يرجى إرفاق الصورة المراد معالجتها.');
        }

        try {
            // المعلمات الأساسية (يجب تعديلها حسب الحاجة)
            const baseWidth = 350; // عرض الخلفية الكلي
            const baseHeight = 350; // ارتفاع الخلفية الكلي
            const profileWidth = 183; // عرض صورتك
            const profileHeight = 179; // ارتفاع صورتك
            const leftPosition = 34; // الإحداثي الأيسر
            const topPosition = 71; // الإحداثي العلوي

            // تحميل الصورة المرفقة
            const imageUrl = message.attachments.first().url;
            const response = await fetch(imageUrl);
            const imageBuffer = await response.buffer();

            // 1. إنشاء خلفية شفافية بحجم كافي
            const baseImage = await sharp({
                create: {
                    width: baseWidth,
                    height: baseHeight,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                }
            }).png().toBuffer();

            // 2. معالجة الصورة الشخصية
            const processedProfile = await sharp(imageBuffer)
                .resize(profileWidth, profileHeight, { fit: 'cover' })
                .toBuffer();

            // 3. دمج الصورة على الخلفية
            const compositeImage = await sharp(baseImage)
                .composite([{
                    input: processedProfile,
                    left: leftPosition,
                    top: topPosition
                }])
                .png()
                .toBuffer();

            // 4. تطبيق شكل دائري
            const circularImage = await sharp(compositeImage)
                .composite([{
                    input: Buffer.from(
                        `<svg width="${baseWidth}" height="${baseHeight}">
                            <circle cx="${baseWidth/2}" cy="${baseHeight/2}" 
                                    r="${Math.min(baseWidth, baseHeight)/2}" 
                                    fill="black"/>
                        </svg>`
                    ),
                    blend: 'dest-in'
                }])
                .png()
                .toBuffer();

            const attachment = new AttachmentBuilder(circularImage, {
                name: 'profile_result.png'
            });

            await message.reply({ files: [attachment] });

        } catch (error) {
            console.error('حدث خطأ تقني:', error);
            message.reply('❌ فشل في المعالجة - تأكد من إرفاق صورة صالحة');
        }
    }
};
