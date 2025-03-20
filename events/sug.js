const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField 
} = require('discord.js');
const config = require('../config.js');

module.exports = (client) => {
    const suggestionChannelId = config.suggestionChannelId;
    const userVotes = {};

    client.on('messageCreate', async (message) => {
        if (message.channel.id !== suggestionChannelId || message.author.bot) return;

        // تجاهل رسائل الإداريين
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            console.log('العضو أدمن، لن يتم تحويل رسالته.');
            return;
        }

        const messageContent = message.content.trim();
        if (!messageContent) {
            console.log('تم إرسال اقتراح فارغ.');
            return;
        }

        const suggestionEmbed = new EmbedBuilder()
            .setColor(0x00B2FF)
            .setDescription(`**الاقتراح:**\n\`\`\`${messageContent}\`\`\``)
            .setTimestamp()
            .setAuthor({ name: `تم الإرسال بواسطة: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setThumbnail(message.guild.iconURL())
            .addFields(
                { name: 'الإجابة', value: 'لم يتم الجواب بعد :hourglass:', inline: true },
                { name: 'التصويتات', value: '<a:True:1280855790021771297> 0 | <a:False:1280855878223921152> 0', inline: true }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`accept_${message.author.id}`).setLabel('قبول').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`reject_${message.author.id}`).setLabel('رفض').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('upvote').setEmoji({ id: '1280855790021771297', name: 'True', animated: true }).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('downvote').setEmoji({ id: '1280855878223921152', name: 'False', animated: true }).setStyle(ButtonStyle.Secondary)
            );

        message.channel.send({ embeds: [suggestionEmbed], components: [row] })
            .then(() => message.delete())
            .catch(console.error);
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const messageId = interaction.message.id;
        const userId = interaction.user.id;

        if (interaction.customId.startsWith('accept') || interaction.customId.startsWith('reject')) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: 'ليس لديك صلاحية لاستخدام هذا الزر.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId(`response-modal-${interaction.customId}`)
                .setTitle('رد على الاقتراح');

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('السبب')
                .setStyle(TextInputStyle.Paragraph);

            const actionRow = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        } else if (interaction.customId === 'upvote' || interaction.customId === 'downvote') {
            if (!userVotes[messageId]) userVotes[messageId] = new Set();
            if (userVotes[messageId].has(userId)) {
                return interaction.reply({ content: 'لقد قمت بالتصويت مسبقًا.', ephemeral: true });
            }
            userVotes[messageId].add(userId);

            const originalEmbed = interaction.message.embeds[0];
            const fields = originalEmbed.fields;
            let upvotes = parseInt(fields[1].value.split('|')[0].trim().split(' ')[1]);
            let downvotes = parseInt(fields[1].value.split('|')[1].trim().split(' ')[1]);

            if (interaction.customId === 'upvote') upvotes++;
            if (interaction.customId === 'downvote') downvotes++;

            const updatedEmbed = EmbedBuilder.from(originalEmbed)
                .spliceFields(1, 1, { name: 'التصويتات', value: `<a:True:1280855790021771297> ${upvotes} | <a:False:1280855878223921152> ${downvotes}`, inline: true });

            await interaction.update({ embeds: [updatedEmbed], components: interaction.message.components });
        }
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit()) return;

        const reason = interaction.fields.getTextInputValue('reason');
        const originalEmbed = interaction.message.embeds[0];
        const decision = interaction.customId.includes('accept') ? 'القبول' : 'الرفض';

        const updatedButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('upvote').setEmoji({ id: '1280855790021771297', name: 'True', animated: true }).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('downvote').setEmoji({ id: '1280855878223921152', name: 'False', animated: true }).setStyle(ButtonStyle.Secondary)
            );

        const updatedEmbed = EmbedBuilder.from(originalEmbed)
            .spliceFields(0, 1, { name: decision, value: reason, inline: true })
            .setColor(decision === 'القبول' ? 0x28A745 : 0xDC3545);

        await interaction.message.edit({ embeds: [updatedEmbed], components: [updatedButtons] });
        await interaction.reply({ content: `تم ${decision.toLowerCase()}.`, ephemeral: true });

        const userId = interaction.customId.split('_')[1];
        const user = await interaction.guild.members.fetch(userId);
        if (user) {
            // إرسال رسالة خاصة للمستخدم مع رابط الاقتراح
            user.send({
                content: `تم الرد على اقتراحك ب${decision}. السبب: ${reason}\n\nرابط اقتراحك: [رابط الاقتراح](https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${interaction.message.id})`
            }).catch(console.error);
        }
    });
};
