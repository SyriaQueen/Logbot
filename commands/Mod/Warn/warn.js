const { EmbedBuilder } = require('discord.js');
const config = require('../../../config.js'); // المسار الصحيح

module.exports = {
    name: 'warn',
    execute: async (message, args, client) => {
        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply('⛔ ليس لديك الصلاحيات اللازمة!');
        }

        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ يرجى تحديد عضو!');
        
        const reason = args.slice(1).join(' ') || 'لا يوجد سبب';

        // تسجيل التحذير
        const warning = {
            id: Date.now(),
            reason,
            date: new Date(),
            moderator: message.author.tag
        };

        // إرسال التحذير للقناة
        const logChannel = client.channels.cache.get(config.logWID);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('تحذير جديد')
                .addFields(
                    { name: 'العضو', value: target.toString(), inline: true },
                    { name: 'السبب', value: reason, inline: true },
                    { name: 'المشرف', value: message.author.tag, inline: true }
                )
                .setTimestamp();
            
            logChannel.send({ embeds: [embed] });
        }

        message.reply(`✅ تم تحذير ${target.tag} بنجاح!`);
    }
};
