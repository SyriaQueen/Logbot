const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'warn',
    execute: async (message, args, client) => {
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply('❌ ليس لديك الصلاحية لاستخدام هذا الأمر.');
        }

        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ يرجى تحديد عضو لتحذيره.');
        
        const reason = args.slice(1).join(' ') || 'لا يوجد سبب';

        // إنشاء كائن التحذير
        const warning = {
            id: Date.now(),
            reason,
            date: new Date(),
            warnerId: message.author.id,
        };

        // إضافة التحذير للذاكرة
        if (!client.warnings) client.warnings = new Map();
        if (!client.warnings.has(target.id)) client.warnings.set(target.id, []);
        client.warnings.get(target.id).push(warning);

        // إرسال رسالة خاصة للعضو
        try {
            await target.send(`⚠️ لقد تم تحذيرك في سيرفر ${message.guild.name}\nالسبب: ${reason}`);
        } catch (err) {
            console.log('تعذر إرسال رسالة خاصة للعضو.');
        }

        // إرسال تأكيد التحذير
        message.reply(`✅ تم تحذير ${target.tag} بنجاح.`);

        // تسجيل التحذير في قناة السجل
        const logChannel = client.channels.cache.get(client.config.logWID);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('تحذير جديد')
                .addFields(
                    { name: 'العضو', value: `${target.tag} (${target.id})` },
                    { name: 'السبب', value: reason },
                    { name: 'بواسطة', value: message.author.tag },
                    { name: 'رقم التحذير', value: warning.id.toString() }
                )
                .setTimestamp();
            
            logChannel.send({ embeds: [logEmbed] });
        }
    }
};
