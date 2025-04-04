const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'removewarn',
    execute: async (message, args, client) => {
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply('❌ ليس لديك الصلاحية لاستخدام هذا الأمر.');
        }

        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ يرجى تحديد عضو.');
        
        const warnId = args[1];
        if (!warnId) return message.reply('❌ يرجى تحديد رقم التحذير.');

        // البحث عن التحذير وحذفه
        const userWarnings = client.warnings?.get(target.id) || [];
        const initialLength = userWarnings.length;
        client.warnings.set(target.id, userWarnings.filter(w => w.id.toString() !== warnId));

        if (initialLength === client.warnings.get(target.id).length) {
            return message.reply('❌ لم يتم العثور على التحذير المحدد.');
        }

        // إرسال التأكيد
        message.reply(`✅ تم حذف التحذير #${warnId} بنجاح.`);

        // تسجيل العملية في السجل
        const logChannel = client.channels.cache.get(client.config.logWID);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('حذف تحذير')
                .addFields(
                    { name: 'العضو', value: `${target.tag} (${target.id})` },
                    { name: 'رقم التحذير', value: warnId },
                    { name: 'بواسطة', value: message.author.tag }
                )
                .setTimestamp();
            
            logChannel.send({ embeds: [logEmbed] });
        }
    }
};
