const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'autoreply',
    aliases: ['رد', 'الرد', 'ردتلقائي'],
    
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: '❌ تحتاج صلاحية **إدارة الخادم**!' });
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

            guildReplies.set(trigger.toLowerCase(), response);
            client.autoReplies.set(message.guild.id, guildReplies);

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setDescription(`✅ **تم إضافة رد:**\nالكلمة: \`${trigger}\`\nالرد: ${response}`)
                ]
            });

        // حذف رد
        } else if (subCommand === 'delete') {
            if (guildReplies.size === 0) {
                return message.reply('❌ لا توجد ردود مضافة!');
            }

            const options = Array.from(guildReplies.entries()).map(([trigger, response]) => ({
                label: trigger.length > 25 ? trigger.slice(0, 22) + '...' : trigger,
                description: response.length > 50 ? response.slice(0, 47) + '...' : response,
                value: `delete|${trigger}`
            }));

            const menu = new StringSelectMenuBuilder()
                .setCustomId('delete_reply')
                .setPlaceholder('اختر ردًا للحذف')
                .addOptions(options);

            return message.reply({
                embeds: [new EmbedBuilder().setColor(0x0099FF).setTitle('🗑️ حذف رد تلقائي')],
                components: [new ActionRowBuilder().addComponents(menu)]
            });

        // عرض الردود
        } else if (subCommand === 'list') {
            if (guildReplies.size === 0) {
                return message.reply('❌ لا توجد ردود مضافة!');
            }

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`📜 قائمة الردود (${guildReplies.size})`)
                .setDescription(
                    Array.from(guildReplies.entries())
                        .map(([trigger, response], index) => `**${index + 1}.** \`${trigger}\` → ${response}`)
                        .join('\n')
                );

            return message.reply({ embeds: [embed] });

        // المساعدة
        } else {
            const helpEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🛠️ مساعدة نظام الردود')
                .addFields(
                    { name: 'إضافة رد', value: '`!رد add [الكلمة] [الرد]`', inline: true },
                    { name: 'حذف رد', value: '`!رد delete`', inline: true },
                    { name: 'عرض الردود', value: '`!رد list`', inline: true }
                );

            return message.reply({ embeds: [helpEmbed] });
        }
    },

    async handleInteractions(interaction, client) {
        if (!interaction.isStringSelectMenu() || interaction.customId !== 'delete_reply') return;
        
        const [action, trigger] = interaction.values[0].split('|');
        const guildReplies = client.autoReplies.get(interaction.guild.id);

        if (action === 'delete' && guildReplies?.has(trigger)) {
            guildReplies.delete(trigger);
            await interaction.update({
                content: `✅ تم حذف الرد: \`${trigger}\``,
                components: []
            });
        }
    }
};
