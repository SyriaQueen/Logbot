const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
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
            return message.reply({ content: '❌ صلاحية مطلوبة: **إدارة الخادم**', flags: 64 });
        }

        const mainEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('⚙️ نظام الردود التلقائية')
            .setDescription('اختر الإجراء المطلوب:');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('listRepBtn') // عرض الردود
                .setLabel('عرض الردود')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📜'),
            new ButtonBuilder()
                .setCustomId('acsRepBtn') // إضافة رد (acs = Add Custom System)
                .setLabel('إضافة رد')
                .setStyle(ButtonStyle.Success)
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
            if (i.customId === 'listRepBtn') {
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
                        .setCustomId('prevPageBtn')
                        .setLabel('السابق')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('nextPageBtn')
                        .setLabel('التالي')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage >= totalPages - 1),
                    new ButtonBuilder()
                        .setCustomId('delRepBtn')
                        .setLabel('حذف')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️')
                );

                await i.update({ 
                    embeds: [generateEmbed()], 
                    components: [navButtons] 
                });

                const pageCollector = msg.createMessageComponentCollector({ time: 60000 });
                
                pageCollector.on('collect', async pi => {
                    if (pi.customId === 'prevPageBtn') currentPage--;
                    if (pi.customId === 'nextPageBtn') currentPage++;
                    
                    if (pi.customId === 'delRepBtn') {
                        const selectMenu = new StringSelectMenuBuilder()
                            .setCustomId('selDelRep') // اختيار الحذف
                            .setPlaceholder('اختر ردًا للحذف')
                            .addOptions(
                                Array.from(guildReplies.entries())
                                    .map(([id, data]) => ({
                                        label: data.triggers.join(', ').slice(0, 25),
                                        description: data.response.slice(0, 50),
                                        value: id
                                    }))
                            );

                        await pi.update({
                            content: 'اختر الرد المراد حذفه:',
                            components: [new ActionRowBuilder().addComponents(selectMenu)],
                            embeds: []
                        });
                    } else {
                        navButtons.components[0].setDisabled(currentPage === 0);
                        navButtons.components[1].setDisabled(currentPage >= totalPages - 1);
                        await pi.update({ embeds: [generateEmbed()], components: [navButtons] });
                    }
                });

            // قسم الإضافة
            } else if (i.customId === 'acsRepBtn') {
                const modal = new ModalBuilder()
                    .setCustomId('mdlAcsRep') // مودال الإضافة
                    .setTitle('إنشاء رد تلقائي');

                const triggersInput = new TextInputBuilder()
                    .setCustomId('inpTriggers')
                    .setLabel('الكلمات المطلوبة (مفصولة بفاصلة)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const responseInput = new TextInputBuilder()
                    .setCustomId('inpResponse')
                    .setLabel('نص الرد')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(triggersInput),
                    new ActionRowBuilder().addComponents(responseInput)
                );

                await i.showModal(modal);
            }
        });
    },

    async handleModal(interaction, client) {
        if (interaction.customId === 'mdlAcsRep') {
            const triggers = interaction.fields.getTextInputValue('inpTriggers')
                .split(',')
                .map(t => t.trim().toLowerCase())
                .filter(t => t.length > 0);

            const response = interaction.fields.getTextInputValue('inpResponse');

            if (!triggers.length || !response) {
                return interaction.reply({ 
                    content: '❌ يجب إدخال بيانات صحيحة!', 
                    flags: 64 
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
                ],
                flags: 64
            });
        }
    },

    async handleInteractions(interaction, client) {
        if (interaction.isStringSelectMenu() && interaction.customId === 'selDelRep') {
            const replyId = interaction.values[0];
            const guildReplies = client.autoReplies.get(interaction.guild.id);
            
            if (guildReplies?.has(replyId)) {
                guildReplies.delete(replyId);
                await interaction.update({
                    content: `✅ تم حذف الرد بنجاح!`,
                    components: [],
                    embeds: []
                });
            }
        }
    }
};
