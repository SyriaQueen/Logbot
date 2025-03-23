const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');
const fetch = require('node-fetch'); // تأكد من تثبيت node-fetch (npm install node-fetch)

module.exports = {
  name: 'profile',
  description: 'عرض الصورة الشخصية داخل خلفية معينة',
  async execute(message, args, client) {
    try {
      // الحصول على رابط الأفاتار الخاص بالمستخدم بصيغة PNG وحجم مناسب
      const avatarURL = message.author.displayAvatarURL({ format: 'png', size: 256 });
      
      // جلب صورة الأفاتار وتحويلها إلى Buffer
      const avatarResponse = await fetch(avatarURL);
      const avatarBuffer = await avatarResponse.buffer();

      // تحديد أبعاد الصورة كما هو مطلوب
      const avatarWidth = Math.round(182.9789217053284);
      const avatarHeight = Math.round(178.6167939136292);

      // إعادة تحجيم صورة الأفاتار
      const resizedAvatar = await sharp(avatarBuffer)
        .resize(avatarWidth, avatarHeight)
        .toBuffer();

      // إنشاء قناع دائري باستخدام SVG
      const radius = Math.min(avatarWidth, avatarHeight) / 2;
      const circleSvg = Buffer.from(
        `<svg width="${avatarWidth}" height="${avatarHeight}">
           <circle cx="${avatarWidth / 2}" cy="${avatarHeight / 2}" r="${radius}" fill="white" />
         </svg>`
      );

      // تطبيق القناع الدائري على صورة الأفاتار
      const circularAvatar = await sharp(resizedAvatar)
        .composite([{ input: circleSvg, blend: 'dest-in' }])
        .png()
        .toBuffer();

      // جلب الخلفية من الرابط المحدد
      const backgroundURL = 'https://i.postimg.cc/85qJ0TyD/background.png';
      const backgroundResponse = await fetch(backgroundURL);
      const backgroundBuffer = await backgroundResponse.buffer();

      // دمج صورة الأفاتار الدائرية مع الخلفية وفقاً للإحداثيات المحددة
      // إحداثيات (يسار): 34.25, (أعلى): 71.29
      const compositeImage = await sharp(backgroundBuffer)
        .composite([{ input: circularAvatar, left: Math.round(34.25), top: Math.round(71.29) }])
        .png()
        .toBuffer();

      // إرسال الصورة الناتجة كمرفق في رسالة الديسكورد
      const attachment = new AttachmentBuilder(compositeImage, { name: 'profile.png' });
      message.channel.send({ files: [attachment] });
    } catch (error) {
      console.error('حدث خطأ أثناء معالجة الصورة:', error);
      message.reply('حدث خطأ أثناء معالجة الصورة.');
    }
  }
};
