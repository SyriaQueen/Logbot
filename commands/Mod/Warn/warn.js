const { EmbedBuilder } = require('discord.js');
const config = require('../../../config.js');

module.exports = {
  name: 'warn',
  description: 'تحذير عضو',
  async execute(message, args, client) {
    const allowedRole = '1324351095291641857'; // استبدليه بـ ID الرتبة المسموحة
    if (!message.member.roles.cache.has(allowedRole) && !message.member.permissions.has('Administrator')) {
      return message.reply('ما عندك صلاحية للتحذير.');
    }

    const user = message.mentions.users.first();
    if (!user) return message.reply('حددي العضو اللي بدكِ تحذريه.');

    const reason = args.slice(1).join(' ') || 'ما في سبب.';
    
    const newWarning = {
      id: client.warningsCache.length + 1,
      userId: user.id,
      moderatorId: message.author.id,
      reason,
      date: new Date().toISOString()
    };

    client.warningsCache.push(newWarning);

    // إرسال التحذير في قناة العامة
    await message.reply(`${user} تم تحذيره بنجاح.`);

    // التحقق إذا كان الخاص مفتوحًا
    try {
      await user.send(`تم تحذيرك في السيرفر **${message.guild.name}** بسبب: **${reason}**. يرجى الامتثال لقوانين السيرفر.`);
    } catch (err) {
      console.log('الخاص مغلق أو لا يمكن إرسال الرسالة.');
    }

    // إرسال سجل التحذير إلى قناة السجل
    const logChannel = message.guild.channels.cache.get(config.logWId);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor(0xFFCC00)
        .setTitle('تم إصدار تحذير جديد')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'المستخدم', value: `<@${user.id}>`, inline: true },
          { name: 'المحذر', value: `<@${message.author.id}>`, inline: true },
          { name: 'السبب', value: reason },
          { name: 'التاريخ', value: `<t:${Math.floor(Date.now() / 1000)}:f>` }
        )
        .setFooter({ text: `ID: ${user.id}` });

      await logChannel.send({ embeds: [embed] });
    }
  }
}
