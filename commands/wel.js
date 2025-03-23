const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    name: 'افتار',
    description: 'يرسل الأفتار الخاص بك داخل خلفية مخصصة',
    async execute(message, args) {
        try {
            const user = message.mentions.users.first() || message.author; // تحديد المستخدم
            const avatarURL = user.displayAvatarURL({ format: 'png', size: 512 });

            // تحميل الخلفية والصورة الشخصية
            const background = await loadImage('https://i.postimg.cc/85qJ0TyD/background.png'); // استبدلي بالمسار الصحيح للخلفية
            const avatar = await loadImage(avatarURL);

            // إنشاء الكانفس بنفس أبعاد الخلفية
            const canvas = createCanvas(background.width, background.height);
            const ctx = canvas.getContext('2d');

            // رسم الخلفية
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // حساب موضع الأفاتار بناءً على الإحداثيات التي ذكرتِها
            const avatarX = 34.25; // الإحداثي الأفقي
            const avatarY = 71.29; // الإحداثي الرأسي
            const avatarWidth = 182.9789217053284; // العرض
            const avatarHeight = 178.6167939136292; // الارتفاع

            // رسم الأفاتار على الخلفية
            ctx.beginPath();
            ctx.arc(
                avatarX + avatarWidth / 2, 
                avatarY + avatarHeight / 2, 
                avatarWidth / 2, 
                0, Math.PI * 2
            );
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX, avatarY, avatarWidth, avatarHeight);

            // تحويل الصورة إلى ملف يمكن إرساله
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'avatar.png' });

            await message.channel.send({ files: [attachment] });
        } catch (error) {
            console.error('حدث خطأ أثناء إنشاء الأفتار:', error);
            message.reply('حدث خطأ أثناء إنشاء الصورة.');
        }
    }
};
