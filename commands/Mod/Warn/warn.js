const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'warn',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ تحتاج صلاحية "إدارة الخادم"');
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ حدد العضو');
        
        const reason = args.slice(1).join(' ') || 'بدون سبب';
        const guildId = message.guild.id;

        // إنشاء هيكل التخزين
        if (!client.warnings.has(guildId)) {
            client.warnings.set(guildId, {
                users: new Map(),
                lastId: 0
            });
        }

        const guildWarns = client.warnings.get(guildId);
        guildWarns.lastId += 1;
        
        const warn = {
            id: guildWarns.lastId,
            user: target.id,
            reason: reason,
            mod: message.author.id,
            date: new Date()
        };

        if (!guildWarns.users.has(target.id)) {
            guildWarns.users.set(target.id, []);
        }
        
        guildWarns.users.get(target.id).push(warn);

        // إرسال DM
        try {
            await target.send({
                embeds: [new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle(`⚠️ تحذير في ${message.guild.name}`)
                    .addFields(
                        { name: 'السبب', value: reason },
                        { name: 'المنذِر', value: message.author.tag }
                    )
                ]
            });
        } catch (error) {
            console.log('فشل إرسال تحذير خاص');
        }

        // تسجيل في اللوغ
        const logChannel = client.channels.cache.get(config.logWID);
        if (logChannel) {
            logChannel.send({
                embeds: [new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('تسجيل تحذير')
                    .addFields(
                        { name: 'العضو', value: target.toString() },
                        { name: 'السبب', value: reason },
                        { name: 'ID', value: `#${warn.id}` }
                    )
                    .setFooter({ text: `بواسطة ${message.author.tag}` })
                ]
            });
        }

        message.reply(`✅ تم تحذير ${target} (ID: #${warn.id})`);
    }
};
