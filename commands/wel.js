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
            // تحميل الصورة
            const imageUrl = message.attachments.first().url;
            const response = await fetch(imageUrl);
            const imageBuffer = await response.buffer(); // <-- التعديل هنا

            // معالجة الصورة مع الإحداثيات
            const processedImage = await sharp(imageBuffer)
                .resize(
                    Math.round(182.9789217053284), 
                    Math.round(178.6167939136292), 
                    { fit: 'cover' }
                )
                .composite([{
                    input: await sharp({
                        create: {
                            width: Math.round(182.9789217053284),
                            height: Math.round(178.6167939136292),
                            channels: 4,
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        }
                    })
                    .composite([{
                        input: imageBuffer,
                        blend: 'over',
                        left: Math.round(34.25),
                        top: Math.round(71.29)
                    }])
                    .png()
                    .toBuffer(),
                    blend: 'over'
                }])
                .extend({
                    background: { r: 255, g: 255, b: 255, alpha: 1 } // خلفية بيضاء
                })
                .toBuffer();

            // إنشاء شكل دائري
            const circularImage = await sharp(processedImage)
                .composite([{
                    input: Buffer.from(
                        `<svg width="${Math.round(182.9789217053284)}" height="${Math.round(178.6167939136292)}">
                            <circle cx="${Math.round(182.9789217053284/2)}" 
                                    cy="${Math.round(178.6167939136292/2)}" 
                                    r="${Math.round(178.6167939136292/2)}" 
                                    fill="black"/>
                        </svg>`
                    ),
                    blend: 'dest-in'
                }])
                .png()
                .toBuffer();

            const attachment = new AttachmentBuilder(circularImage, { 
                name: 'profile_circle.png' 
            });

            await message.reply({ files: [attachment] });

        } catch (error) {
            console.error('حدث خطأ:', error);
            message.reply('❌ فشل في معالجة الصورة - تأكد من إرفاق صورة صالحة');
        }
    }
};
