const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionsBitField,
    StringSelectMenuBuilder 
} = require('discord.js');

module.exports = {
    name: 'autoreply',
    aliases: ['رد', 'الرد', 'ردتلقائي'],
    
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: '❌ تحتاج صلاحية **إدارة الخادم**!', ephemeral: true });
        }

        const mainEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('⚙️ نظام الردود التلقائية')
            .setDescription('اختر الإجراء المطلوب من الأزرار أدناه:');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('list_replies')
                .setLabel('عرض الردود')
                .setStyle(1)
                .setEmoji('📜'),
            new ButtonBuilder()
                .setCustomId('add_reply')
                .setLabel('إضافة رد')
                .setStyle(3)
                .setEmoji('➕')
        );

        const msg = await message.reply({ 
            embeds: [mainEmbed], 
            components: [buttons] 
        });

        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return;

            // قسم عرض الردود
            if (i.customId === 'list_replies') {
                const guildReplies = client.autoReplies.get(message.guild.id);
                if (!guildReplies?.size) {
                    return i.update({ content: '❌ لا توجد ردود مضافة!', components: [] });
                }

                let currentPage = 0;
                const perPage = 5;
                const totalPages = Math.ceil(guildReplies.size / perPage);

                const generateEmbed = () => {
                    const replies = Array.from(guildReplies.entries())
                        .slice(currentPage * perPage, (currentPage + 1) * perPage);

                    return new EmbedBuilder()
                        .setColor(0x2F3136)
                        .setTitle(`📂 الردود (الصفحة ${currentPage + 1}/${totalPages})`)
                        .setDescription(
                            replies.map(([id, data], index) => 
                                `**${currentPage * perPage + index + 1}.** \`${data.triggers.join(', ')}\`\n↳ ${data.response}`
                            ).join('\n\n')
                        );
                };

                const navButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('السابق')
                        .setStyle(2)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('التالي')
                        .setStyle(2)
                        .setDisabled(currentPage >= totalPages - 1),
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
                        const selectMenu = new StringSelectMenuBuilder()
                            .setCustomId('delete_reply')
                            .setPlaceholder('اختر ردًا للحذف')
                            .addOptions(
                                Array.from(guildReplies.entries())
                                    .map(([id, data]) => ({
                                        label: data.triggers.join(', ').slice(0, 50),
                                        description: data.response.slice(0, 50),
                                        value: id
                                    }))
                            );

                        await pi.showModal(new ModalBuilder()
                            .setCustomId('confirm_delete')
                            .setTitle('تأكيد الحذف')
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId('confirm')
                                        .setLabel('اكتب "تأكيد" لحذف الرد')
                                        .setStyle(TextInputStyle.Short)
                                )
                            ));
                    }

                    navButtons.components[0].setDisabled(currentPage === 0);
                    navButtons.components[1].setDisabled(currentPage >= totalPages - 1);
                    await pi.update({ embeds: [generateEmbed()], components: [navButtons] });
                });

            // قسم الإضافة
            } else if (i.customId === 'add_reply') {
                const modal = new ModalBuilder()
                    .setCustomId('add_reply_modal')
                    .setTitle('إنشاء رد تلقائي');

                const triggersInput = new TextInputBuilder()
                    .setCustomId('triggers')
                    .setLabel('الكلمات المطلوبة (مفصولة بفاصلة)')
                    .setStyle(TextInputStyle.Short);

                const responseInput = new TextInputBuilder()
                    .setCustomId('response')
                    .setLabel('نص الرد')
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
        if (interaction.customId === 'add_reply_modal') {
            const triggers = interaction.fields.getTextInputValue('triggers')
                .split(',')
                .map(t => t.trim().toLowerCase())
                .filter(t => t.length > 0);

            const response = interaction.fields.getTextInputValue('response');

            if (!triggers.length || !response) {
                return interaction.reply({ 
                    content: '❌ يجب إدخال بيانات صحيحة!', 
                    ephemeral: true 
                });
            }

            const guildReplies = client.autoReplies.get(interaction.guild.id) || new Map();
            guildReplies.set(Date.now().toString(), { triggers, response });
            client.autoReplies.set(interaction.guild.id, guildReplies);

            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setDescription(`✅ **تمت الإضافة بنجاح**\nالكلمات: \`${triggers.join(', ')}\`\nالرد: ${response}`)
                ]
            });
        }

        if (interaction.customId === 'confirm_delete') {
            const confirmation = interaction.fields.getTextInputValue('confirm');
            if (confirmation !== 'تأكيد') {
                return interaction.reply({ 
                    content: '❌ تم إلغاء الحذف', 
                    ephemeral: true 
                });
            }

            const guildReplies = client.autoReplies.get(interaction.guild.id);
            const replyId = interaction.message.embeds[0].description
                .match(/\*\*(\d+)\.\*\*/)[1];

            if (guildReplies?.has(replyId)) {
                guildReplies.delete(replyId);
                await interaction.reply({ 
                    content: `✅ تم حذف الرد رقم ${replyId}`, 
                    ephemeral: true 
                });
            }
        }
    }
};
