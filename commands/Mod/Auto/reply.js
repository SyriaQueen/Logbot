const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    name: 'autoreply',
    aliases: ['رد', 'الرد', 'ردتلقائي'],
    
    async execute(message, args, client) {
        const mainEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('⚙️ نظام الردود التلقائية')
            .setDescription('اختر الإجراء المطلوب:');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('info')
                .setLabel('معلومات')
                .setStyle(1),
            new ButtonBuilder()
                .setCustomId('add')
                .setLabel('إضافة')
                .setStyle(3)
        );

        const msg = await message.reply({ 
            embeds: [mainEmbed], 
            components: [buttons] 
        });

        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return;
            
            // قسم المعلومات
            if (i.customId === 'info') {
                const guildReplies = client.autoReplies.get(message.guild.id) || new Map();
                if (guildReplies.size === 0) return i.update({ content: '❌ لا توجد ردود!', components: [] });

                let currentPage = 0;
                const perPage = 5;
                const totalPages = Math.ceil(guildReplies.size / perPage);

                const generateEmbed = () => {
                    const replies = Array.from(guildReplies.entries())
                        .slice(currentPage * perPage, (currentPage + 1) * perPage);

                    return new EmbedBuilder()
                        .setColor(0x2F3136)
                        .setTitle(`📜 الردود (${currentPage + 1}/${totalPages})`)
                        .setDescription(
                            replies.map(([id, data], index) => 
                                `**${currentPage * perPage + index + 1}.** ${data.triggers.join(', ')}\n↳ ${data.response}`
                        ).join('\n\n'))
                        .setFooter({ text: 'استخدم الأزرار للتحكم' });
                };

                const navButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('السابق')
                        .setStyle(2),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('التالي')
                        .setStyle(2),
                    new ButtonBuilder()
                        .setCustomId('delete')
                        .setLabel('حذف')
                        .setStyle(4)
                        .setEmoji('🗑️')
                );

                await i.update({ 
                    embeds: [generateEmbed()], 
                    components: [navButtons] 
                });

                const pageCollector = msg.createMessageComponentCollector({ time: 60000 });
                
                pageCollector.on('collect', async pi => {
                    if (pi.customId === 'prev') currentPage--;
                    if (pi.customId === 'next') currentPage++;
                    if (pi.customId === 'delete') {
                        // كود الحذف هنا
                    }
                    
                    navButtons.components[0].setDisabled(currentPage === 0);
                    navButtons.components[1].setDisabled(currentPage >= totalPages - 1);
                    await pi.update({ embeds: [generateEmbed()], components: [navButtons] });
                });

            // قسم الإضافة
            } else if (i.customId === 'add') {
                const modal = new ModalBuilder()
                    .setCustomId('add_reply')
                    .setTitle('إضافة رد جديد');

                const triggersInput = new TextInputBuilder()
                    .setCustomId('triggers')
                    .setLabel('الكلمات المطلوبة (مفصولة بفاصلة)')
                    .setStyle(TextInputStyle.Short);

                const responseInput = new TextInputBuilder()
                    .setCustomId('response')
                    .setLabel('الرد المراد إرساله')
                    .setStyle(TextInputStyle.Paragraph);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(triggersInput),
                    new ActionRowBuilder().addComponents(responseInput)
                );

                await i.showModal(modal);
            }
        });
    },

    async handleModal(interaction, client) {
        if (interaction.customId !== 'add_reply') return;
        
        const triggers = interaction.fields.getTextInputValue('triggers')
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);

        const response = interaction.fields.getTextInputValue('response');

        if (!triggers.length || !response) {
            return interaction.reply({ content: '❌ يجب إدخال بيانات صحيحة!', ephemeral: true });
        }

        const guildReplies = client.autoReplies.get(interaction.guild.id) || new Map();
        const replyId = Date.now().toString();

        guildReplies.set(replyId, {
            triggers: triggers,
            response: response
        });

        client.autoReplies.set(interaction.guild.id, guildReplies);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setDescription(`✅ **تم الإضافة بنجاح**\nالكلمات: \`${triggers.join(', ')}\`\nالرد: ${response}`)
            ]
        });
    }
};
