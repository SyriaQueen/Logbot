const { EmbedBuilder } = require('discord.js');
const config = require('../../../config.js'); // استيراد الكونفيج

module.exports = {
    name: 'removewarn',
    execute: async (message, args, client) => {
        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply('⛔ ليس لديك الصلاحيات اللازمة!');
        }

        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ يرجى تحديد عضو!');
        
        const warnId = args[1];
        if (!warnId) return message.reply('❌ يرجى تحديد رقم التحذير!');

        // البحث عن التحذير
        if (!client.warnings) client.warnings = new Map();
        const userWarnings = client.warnings.get(target.id) || [];
        
        const initialLength = userWarnings.length;
        const newWarnings = userWarnings.filter(w => w.id.toString() !== warnId);
        
        if (newWarnings.length === initialLength) {
            return message.reply('❌ لم يتم العثور على التحذير المحدد!');
        }

        // تحديث التحذيرات
        client.warnings.set(target.id, newWarnings);
        message.reply(`✅ تم إزالة التحذير #${warnId} بنجاح!`);

        // تسجيل الإزالة في السجل
        const logChannel = client.channels.cache.get(config.logWID);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('إزالة تحذير')
                .addFields(
                    { name: 'العضو', value: target.toString(), inline: true },
                    { name: 'رقم التحذير', value: warnId, inline: true },
                    { name: 'المشرف', value: message.author.tag, inline: true }
                )
                .setTimestamp();
            
            logChannel.send({ embeds: [embed] });
        }
    }
};
