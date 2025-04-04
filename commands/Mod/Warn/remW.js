module.exports = {
  name: 'removewarn',
  description: 'حذف تحذير برقم معيّن',
  async execute(message, args, client) {
    const allowedRole = '1324351095291641857'; // استبدليه بـ ID الرتبة المسموحة
    if (!message.member.roles.cache.has(allowedRole) && !message.member.permissions.has('Administrator')) {
      return message.reply('ما عندك صلاحية لحذف التحذيرات.');
    }

    const warnId = parseInt(args[0]);
    if (isNaN(warnId)) return message.reply('رجاءً اكتبي رقم التحذير اللي تبغي تحذفيه.');

    const index = client.warningsCache.findIndex(w => w.id === warnId);
    if (index === -1) return message.reply('ما في تحذير بهذا الرقم.');

    const removed = client.warningsCache.splice(index, 1)[0];

    await message.reply(`تم حذف التحذير رقم ${warnId} لـ <@${removed.userId}>.`);

    const logChannel = message.guild.channels.cache.get(config.logWId);
    if (logChannel) {
      await logChannel.send(`تم حذف التحذير رقم ${warnId} لـ <@${removed.userId}> من قبل <@${message.author.id}>.`);
    }
  }
};
