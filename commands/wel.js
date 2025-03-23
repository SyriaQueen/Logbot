const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fetch = require('node-fetch');

module.exports = {
    name: 'صورة',
    async execute(message, args, client) {
        try {
            // الإعدادات الدقيقة حسب طلبك
            const settings = {
                width: 183,
                height: 179,
                left: 34.25,
                top: 71.29,
                bgColor: '#FFFFFF00' // خلفية شفافة
            };

            // 1. الحصول على أفاتار المستخدم
            const user = message.author;
            const avatarURL = user.displayAvatarURL({ format: 'png', size: 1024 });

            // 2. إنشاء Canvas
            const canvas = createCanvas(settings.width, settings.height);
            const ctx = canvas.getContext('2d');

            // 3. تحميل الصورة
            const image = await loadImage(await (await fetch(avatarURL)).buffer());
            
            // 4. رسم الخلفية
            ctx.fillStyle = settings.bgColor;
            ctx.fillRect(0, 0, settings.width, settings.height);

            // 5. قص الصورة بشكل دائري
            ctx.beginPath();
            ctx.arc(
                settings.width/2, 
                settings.height/2, 
                Math.min(settings.width, settings.height)/2, 
                0, 
                Math.PI * 2
            );
            ctx.closePath();
            ctx.clip();

            // 6. رسم الصورة حسب الإحداثيات
            ctx.drawImage(
                image,
                settings.left,
                settings.top,
                settings.width,
                settings.height
            );

            // 7. تحويل إلى Buffer وإرسال
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'avatar.png' });

            await message.reply({ 
                content: '🎇 صورتك الجاهزة:', 
                files: [attachment] 
            });

        } catch (error) {
            console.error('حدث خطأ:', error);
            message.reply('❌ فشل في المعالجة - تأكد من وجود صورة في البروفايل');
        }
    }
};
