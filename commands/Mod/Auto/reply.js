const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'autoreply',
    aliases: ['رد', 'الرد', 'ردتلقائي'],
    
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: '❌ صلاحية مطلوبة: **إدارة الخادم**' });
        }

        const mainEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('⚙️ نظام الردود التلقائية')
            .setDescription('اختر الإجراء المطلوب:');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('list_replies')
                .setLabel('عرض الردود')
                .setStyle(1),
            new ButtonBuilder()
                .setCustomId('add_reply')
                .setLabel('إضافة رد')
                .setStyle(3)
        );

        const msg = await message.reply({ embeds: [mainEmbed], components: [buttons] });
        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return;
            
            if (i.customId === 'list_replies') {
                // ... (كود عرض الردود مع الباجنيشن)
            } 
            else if (i.customId === 'add_reply') {
                const modal = new ModalBuilder()
                    .setCustomId('add_reply_modal')
                    .setTitle('إضافة رد جديد');

                const triggersInput = new TextInputBuilder()
                    .setCustomId('triggers_input')
                    .setLabel('الكلمات المطلوبة (مفصولة بفاصلة)')
                    .setStyle(TextInputStyle.Short);

                const responseInput = new TextInputBuilder()
                    .setCustomId('response_input')
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
        if (interaction.customId !== 'add_reply_modal') return;
        
        const triggers = interaction.fields.getTextInputValue('triggers_input')
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);

        const response = interaction.fields.getTextInputValue('response_input');

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
                    .setDescription(`✅ **تمت الإضافة**\nالكلمات: \`${triggers.join(', ')}\`\nالرد: ${response}`)
            ]
        });
    },

    async handleInteractions(interaction, client) {
        if (!interaction.isStringSelectMenu()) return;
        
        if (interaction.customId === 'delete_reply') {
            const [action, triggerId] = interaction.values[0].split('|');
            const guildReplies = client.autoReplies.get(interaction.guild.id);
            
            if (action === 'delete' && guildReplies?.has(triggerId)) {
                guildReplies.delete(triggerId);
                await interaction.update({
                    content: `✅ تم حذف الرد: \`${triggerId}\``,
                    components: []
                });
            }
        }
    }
};
