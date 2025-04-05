const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../../config.js');

module.exports = {
    name: 'warn',
    aliases: ['تحذير', 'انذار', 'إنذار'],
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: '❌ صلاحية مطلوبة: **إدارة الخادم**' });
        }

        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'لم يُذكر سبب';

        if (!target) return message.reply({ content: '❌ يرجى تحديد العضو!' });

        // إنشاء نظام التخزين
        const guildId = message.guild.id;
        if (!client.warnings.has(guildId)) {
            client.warnings.set(guildId, { users: new Map(), lastId: 0 });
        }

        const guildData = client.warnings.get(guildId);
        const warnId = ++guildData.lastId;

        const warnData = {
            id: warnId,
            user: target.id,
            reason,
            moderator: message.author.id,
            date: Date.now()
        };

        if (!guildData.users.has(target.id)) {
            guildData.users.set(target.id, []);
        }
        guildData.users.get(target.id).push(warnData);

        // إرسال إنذار خاص
        try {
            await target.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setTitle(`⚠️ تحذير من ${message.guild.name}`)
                        .addFields(
                            { name: 'السبب', value: reason },
                            { name: 'المشرف', value: message.author.tag }
                        )
                        .setFooter({ text: 'للمراجعة تواصل مع الإدارة' })
                ]
            });
        } catch (error) { console.log('❌ فشل إرسال التحذير الخاص'); }

        // تسجيل في السجل
        const logChannel = client.channels.cache.get(config.logWID);
        if (logChannel) {
            logChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFFA500)
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                        .setTitle('📝 تحذير جديد')
                        .addFields(
                            { name: '👤 العضو', value: `${target} (\`${target.id}\`)`, inline: true },
                            { name: '🛡️ المشرف', value: message.author.toString(), inline: true },
                            { name: '📄 السبب', value: reason, inline: false },
                            { name: '🆔 المعرف', value: `\`#${warnId}\``, inline: true },
                            { name: '📅 التاريخ', value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
                        )
                        .setFooter({ text: 'نظام التحذيرات • v2.0' })
                        .setTimestamp()
                ]
            });
        }

        message.reply({ content: `✅ تم تحذير ${target} (\`#${warnId}\`)` });
    }
};
