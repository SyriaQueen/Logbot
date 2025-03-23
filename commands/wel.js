const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');
const fs = require('fs');

module.exports = {
    name: 'صورة',
    async execute(message, args, client) {
        // التحقق من وجود صورة مرفقة
        if (!message.attachments.size) {
            return message.reply('يرجى إرفاق الصورة المراد معالجتها.');
        }

        try {
            // تحميل الصورة المرفقة
            const imageUrl = message.attachments.first().url;
            const response = await fetch(imageUrl);
            const imageBuffer = await response.buffer();

            // معالجة الصورة
            const processedImage = await sharp(imageBuffer)
                .resize(182, 178) // تغيير الحجم حسب القياسات
                .composite([{
                    input: await sharp({
                        create: {
                            width: 182,
                            height: 178,
                            channels: 4,
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        }
                    })
                    .composite([{
                        input: imageBuffer,
                        blend: 'over',
                        left: 34,
                        top: 71
                    }])
                    .png()
                    .toBuffer(),
                    blend: 'over'
                }])
                .extend({
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .toBuffer();

            // حفظ وإرسال الصورة
            fs.writeFileSync('processed_image.png', processedImage);
            const attachment = new AttachmentBuilder('processed_image.png');
            
            message.reply({ files: [attachment] });
        } catch (error) {
            console.error(error);
            message.reply('حدث خطأ أثناء معالجة الصورة.');
        }
    }
};
