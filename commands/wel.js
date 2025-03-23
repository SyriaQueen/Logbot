const { AttachmentBuilder } = require('discord.js');
const sharp = require('sharp');
const axios = require('axios'); // استبدال fetch بـ axios لأنه أكثر استقرارًا

module.exports = {
  name: 'profile',
  description: 'عرض الصورة الشخصية داخل خلفية معينة',
  async execute(message) {
    try {
      // الحصول على رابط الصورة الرمزية بصيغة PNG
      const avatarURL = message.author.displayAvatarURL({ format: 'png', size: 512 });

      // تحميل الصورة الرمزية والخلفية
      const [avatarResponse, backgroundResponse] = await Promise.all([
        axios.get(avatarURL, { responseType: 'arraybuffer' }),
        axios.get('https://i.postimg.cc/85qJ0TyD/background.png', { responseType: 'arraybuffer' })
      ]);

      const avatarBuffer = Buffer.from(avatarResponse.data);
      const backgroundBuffer = Buffer.from(backgroundResponse.data);

      // تحديد أبعاد الصورة الرمزية
      const avatarWidth = 183;
      const avatarHeight = 179;

      // إعادة تحجيم الصورة الرمزية
      const resizedAvatar = await sharp(avatarBuffer)
        .resize(avatarWidth, avatarHeight)
        .png()
        .toBuffer();

      // إنشاء قناع دائري باستخدام SVG
      const circleSvg = Buffer.from(
        `<svg width="${avatarWidth}" height="${avatarHeight}">
           <circle cx="${avatarWidth / 2}" cy="${avatarHeight / 2}" r="${avatarWidth / 2}" fill="white"/>
         </svg>`
      );

      // تطبيق القناع الدائري
      const circularAvatar = await sharp(resizedAvatar)
        .composite([{ input: circleSvg, blend: 'dest-in' }])
        .png()
        .toBuffer();

      // دمج الصورة الرمزية مع الخلفية في الإحداثيات المطلوبة
      const compositeImage = await sharp(backgroundBuffer)
        .composite([{ input: circularAvatar, left: 34, top: 71 }])
        .png()
        .toBuffer();

      // إرسال الصورة النهائية
      const attachment = new AttachmentBuilder(compositeImage, { name: 'profile.png' });
      await message.channel.send({ files: [attachment] });

    } catch (error) {
      console.error('حدث خطأ أثناء معالجة الصورة:', error);
      message.reply('حدث خطأ أثناء معالجة الصورة.');
    }
  }
};
