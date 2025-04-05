const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../../config.js');

module.exports = {
    name: 'removewarn',
    aliases: ['حذف_تحذير', 'ازالة_انذار', 'إزالة_إنذار'],
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: '❌ صلاحية مطلوبة: **إدارة الخادم**' });
        }

        const target = message.mentions.users.first();
        const warnId = parseInt(args[1]);

        if (!target || isNaN(warnId)) {
            return message.reply({ content: '❌ استخدام: `!حذف_تحذير @العضو [رقم_التحذير]`' });
        }

        const guildData = client.warnings.get(message.guild.id);
        if (!guildData?.users?.has(target.id)) {
            return message.reply({ content: '❌ لا يوجد تحذيرات!' });
        }

        const userWarns = guildData.users.get(target.id);
        const warnIndex = userWarns.findIndex(w => w.id === warnId);

        if (warnIndex === -1) {
            return message.reply({ content: '❌ رقم التحذير غير صحيح!' });
        }

        const removedWarn = userWarns.splice(warnIndex, 1)[0];

        // التسجيل
        const logChannel = client.channels.cache.get(config.logWID);
        if (logChannel) {
            logChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                        .setTitle('❌ إزالة تحذير')
                        .addFields(
                            { name: '👤 العضو', value: `${target} (\`${target.id}\`)`, inline: true },
                            { name: '🛡️ المشرف', value: message.author.toString(), inline: true },
                            { name: '📅 تاريخ الإصدار', value: `<t:${Math.floor(removedWarn.date/1000)}:R>`, inline: true },
                            { name: '📝 السبب', value: removedWarn.reason.substring(0, 100) + '...', inline: false },
                            { name: '🆔 المعرف', value: `\`#${removedWarn.id}\``, inline: true }
                        )
                        .setFooter({ text: `تم الإزالة بعد ${Math.floor((Date.now() - removedWarn.date)/86400000)} يومًا` })
                        .setTimestamp()
                ]
            });
        }

        message.reply({ content: `✅ تم إزالة التحذير \`#${removedWarn.id}\` من ${target}` });
    }
};
