const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');
const config = require('../config.js'); // تغيير من config.json إلى config.js

module.exports = (client) => {
    const suggestionChannelId = config.suggestionChannelId;
    const userVotes = {};

    client.on('messageCreate', (message) => {
        if (message.channel.id !== suggestionChannelId) return;

        const messageContent = message.content;

        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            console.log('العضو يمتلك صلاحية أدمن، لن يتم تحويل الرسالة.');
            return;
        }

        if (!messageContent.trim()) {
            console.log('تم ارسال اقتراح جديد.');
            return;
        }

        const suggestionEmbed = new EmbedBuilder()
            .setColor(0x00B2FF)
            .setDescription(`**الاقتراح :**\n\`\`\`${messageContent}\`\`\``)
            .setTimestamp()
            .setAuthor({ name: `تم الارسال بواسطة : ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setThumbnail(message.guild.iconURL())
            .addFields(
                { name: 'الإجابة', value: 'لم يتم الجواب بعد :hourglass: ', inline: true },
                { name: 'التصويتات', value: '<a:True:1280855790021771297> 0 | <a:False:1280855878223921152> 0', inline: true }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_${message.author.id}`)
                    .setLabel('قبول')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`reject_${message.author.id}`)
                    .setLabel('رفض')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('upvote')
                    .setEmoji({ id: '1280855790021771297', name: 'True', animated: true })
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('downvote')
                    .setEmoji({ id: '1280855878223921152', name: 'False', animated: true })
                    .setStyle(ButtonStyle.Secondary)
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
                return interaction.reply({ content: 'ليس لديك صلاحية لاستخدام هذا الزر.', flags: 64 });
            }

            const modal = new ModalBuilder()
                .setCustomId(`response-modal-${interaction.customId}`)
                .setTitle('Response');

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Reason')
                .setStyle(TextInputStyle.Paragraph);

            const actionRow = new ActionRowBuilder().addComponents(reasonInput);

            modal.addComponents(actionRow);

            await interaction.showModal(modal);
        } else if (interaction.customId === 'up...
