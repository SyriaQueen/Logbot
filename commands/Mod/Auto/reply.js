const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'autoreply',
    aliases: ['رد', 'الرد', 'ردتلقائي'],
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ صلاحية مطلوبة: **إدارة الخادم**');
        }

        const subCommand = args[0]?.toLowerCase();
        const guildReplies = client.autoReplies.get(message.guild.id) || new Map();

        // إضافة رد
        if (subCommand === 'add') {
            const trigger = args[1];
            const response = args.slice(2).join(' ');

            if (!trigger || !response) {
                return message.reply('❌ استخدام: `!رد add [الكلمة] [الرد]`');
            }

            client.autoReplies.set(message.guild.id, guildReplies.set(trigger.toLowerCase(), response));
            return message.reply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setDescription(`✅ **تم إضافة رد جديد**\nالكلمة: \`${trigger}\`\nالرد: ${response}`)
                ]
            });

        // قائمة الردود مع التصفح
        } else if (subCommand === 'list') {
            const allReplies = Array.from(guildReplies.entries());
            if (allReplies.length === 0) return message.reply('❌ لا توجد ردود مضافة!');

            let currentPage = 0;
            const perPage = 5;
            const totalPages = Math.ceil(allReplies.length / perPage);

            const generateEmbed = () => new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`📜 الردود التلقائية (الصفحة ${currentPage + 1}/${totalPages})`)
                .setDescription(
                    allReplies
                        .slice(currentPage * perPage, (currentPage + 1) * perPage)
                        .map(([trigger, response], index) => 
                            `**${currentPage * perPage + index + 1}.** \`${trigger}\`\n↳ ${response}`
                        )
                        .join('\n\n')
                );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('السابق')
                    .setStyle(2)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('التالي')
                    .setStyle(2)
                    .setDisabled(currentPage >= totalPages - 1)
            );

            const msg = await message.reply({ 
                embeds: [generateEmbed()], 
                components: [buttons] 
            });

            const collector = msg.createMessageComponentCollector({ time: 60000 });
            collector.on('collect', async i => {
                if (i.user.id !== message.author.id) return;
                i.customId === 'prev' ? currentPage-- : currentPage++;
                buttons.components[0].setDisabled(currentPage === 0);
                buttons.components[1].setDisabled(currentPage >= totalPages - 1);
                await i.update({ embeds: [generateEmbed()], components: [buttons] });
            });

        // حذف رد
        } else if (subCommand === 'delete') {
            if (guildReplies.size === 0) return message.reply('❌ لا توجد ردود!');

            const options = Array.from(guildReplies.entries())
                .slice(0, 25)
                .map(([trigger, response]) => ({
                    label: trigger.substring(0, 25),
                    description: response.substring(0, 50),
                    value: `delete|${trigger}`
                }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('delete_reply')
                .setPlaceholder('اختر رد للحذف')
                .addOptions(options);

            await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('🗑️ حذف رد تلقائي')
                        .setDescription('اختر من القائمة أدناه:')
                ],
                components: [new ActionRowBuilder().addComponents(selectMenu)]
            });

        // تعديل رد
        } else if (subCommand === 'edit') {
            const trigger = args[1];
            const newResponse = args.slice(2).join(' ');

            if (!guildReplies.has(trigger)) {
                return message.reply('❌ هذه الكلمة غير موجودة!');
            }

            guildReplies.set(trigger, newResponse);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setDescription(`✏️ **تم تعديل الرد**\nالكلمة: \`${trigger}\`\nالرد الجديد: ${newResponse}`)
                ]
            });

        // المساعدة
        } else {
            const helpEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🛠️ نظام الردود التلقائية')
                .addFields(
                    { name: 'إضافة رد', value: '`!رد add [الكلمة] [الرد]`' },
                    { name: 'تعديل رد', value: '`!رد edit [الكلمة] [الرد_الجديد]`' },
                    { name: 'حذف رد', value: '`!رد delete`' },
                    { name: 'عرض الردود', value: '`!رد list`' }
                );

            message.reply({ embeds: [helpEmbed] });
        }
    }
};
