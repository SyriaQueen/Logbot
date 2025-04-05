const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../../config.js');

module.exports = {
    name: 'removewarn',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ صلاحية مطلوبة: إدارة الخادم');
        }

        const target = message.mentions.users.first();
        const warnId = Number(args[1]);

        if (!target || !warnId) {
            return message.reply('❌ استخدام: !removewarn @العضو [رقم التحذير]');
        }

        const guildWarns = client.warnings.get(message.guild.id);
        if (!guildWarns?.users?.has(target.id)) {
            return message.reply('❌ لا يوجد تحذيرات لهذا العضو');
        }

        const warns = guildWarns.users.get(target.id);
        const index = warns.findIndex(w => w.id === warnId);

        if (index === -1) {
            return message.reply('❌ رقم التحذير غير صحيح');
        }

        warns.splice(index, 1);

        // تسجيل الإزالة
        const logChannel = client.channels.cache.get(config.logWID);
        if (logChannel) {
            logChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('إزالة تحذير')
                    .addFields(
                        { name: 'العضو', value: target.toString() },
                        { name: 'التحذير المزال', value: `#${warnId}` },
                        { name: 'المشرف', value: message.author.toString() }
                    )
                ]
            });
        }

        message.reply(`✅ تم إزالة التحذير #${warnId} من ${target}`);
    }
};
