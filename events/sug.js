const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');
const config = require('../config.json');

module.exports = (client) => {
    const suggestionChannelId = config.suggestionChannelId;
    const userVotes = {};

    // التعامل مع الرسائل الجديدة (نظام الاقتراحات)
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

    // التعامل مع التفاعلات (التصويت والردود)
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
        } else if (interaction.customId === 'upvote' || interaction.customId === 'downvote') {
            if (!userVotes[messageId]) userVotes[messageId] = new Set();
            if (userVotes[messageId].has(userId)) {
                return interaction.reply({ content: 'لقد قمت بالتصويت على هذا الاقتراح بالفعل.', flags: 64 });
            }
            userVotes[messageId].add(userId);

            const originalEmbed = interaction.message.embeds[0];
            const fields = originalEmbed.fields;
            let upvotes = parseInt(fields[1].value.split('|')[0].trim().split(' ')[1]);
            let downvotes = parseInt(fields[1].value.split('|')[1].trim().split(' ')[1]);

            if (interaction.customId === 'upvote') upvotes++;
            if (interaction.customId === 'downvote') downvotes++;

            const updatedEmbed = new EmbedBuilder(originalEmbed)
                .spliceFields(1, 1, { name: 'التصويتات', value: `<a:True:1280855790021771297> ${upvotes} | <a:False:1280855878223921152> ${downvotes}`, inline: true });

            await interaction.update({ embeds: [updatedEmbed], components: interaction.message.components });
        }
    });

    // التعامل مع استجابات النماذج (القبول أو الرفض مع السبب)
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isModalSubmit()) return;

        const reason = interaction.fields.getTextInputValue('reason');
        const originalEmbed = interaction.message.embeds[0];
        const decision = interaction.customId.includes('accept') ? 'القبول' : 'الرفض';

        const updatedButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('upvote')
                    .setEmoji({ id: '1280855790021771297', name: 'True', animated: true })
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('downvote')
                    .setEmoji({ id: '1280855878223921152', name: 'False', animated: true })
                    .setStyle(ButtonStyle.Secondary)
            );

        const updatedEmbed = new EmbedBuilder(originalEmbed)
            .spliceFields(0, 1, { name: decision, value: reason, inline: true })
            .setColor(decision === 'القبول' ? 0x28A745 : 0xDC3545);

        await interaction.message.edit({ embeds: [updatedEmbed], components: [updatedButtons] });
        await interaction.reply({ content: `تم ${decision.toLowerCase()}.`, flags: 64 });

        const user = await interaction.guild.members.fetch(interaction.customId.split('_')[1]);
        if (user) {
            user.send({ content: `تم الرد على اقتراحك ب ${decision}. السبب: ${reason}` });
        }
    });
};
