const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, MessageFlags 
} = require('discord.js');
const config = require('../config.js');

module.exports = (client) => {
    const suggestionChannelId = config.suggestionChannelId;
    const suggestionLogChannelId = config.suggestionLogChannelId;
    const userVotes = {};

    client.on('messageCreate', async (message) => {
        if (message.channel.id !== suggestionChannelId || message.author.bot) return;
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const messageContent = message.content.trim();
        if (!messageContent) return;

        const suggestionEmbed = new EmbedBuilder()
            .setColor(0x00B2FF)
            .setDescription(`**الاقتراح:**\n${messageContent}`)
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
                return interaction.reply({ content: 'ليس لديك صلاحية لاستخدام هذا الزر.', flags: MessageFlags.Ephemeral });
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
                return interaction.reply({ content: 'لقد قمت بالتصويت مسبقًا.', flags: MessageFlags.Ephemeral });
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
        const decision = interaction.customId.includes('accept') ? '✅ القبول' : '❌ الرفض';
        const decisionColor = interaction.customId.includes('accept') ? 0x28A745 : 0xDC3545;

        const updatedButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('upvote').setEmoji({ id: '1280855790021771297', name: 'True', animated: true }).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('downvote').setEmoji({ id: '1280855878223921152', name: 'False', animated: true }).setStyle(ButtonStyle.Secondary)
            );

        const updatedEmbed = EmbedBuilder.from(originalEmbed)
            .spliceFields(0, 1, { name: decision, value: reason, inline: true })
            .setColor(decisionColor);

        await interaction.message.edit({ embeds: [updatedEmbed], components: [updatedButtons] });
        await interaction.reply({ content: `تم ${decision.replace('✅ ', '').replace('❌ ', '').toLowerCase()}.`, flags: MessageFlags.Ephemeral });

        const userId = interaction.customId.split('_')[1];
        const user = await interaction.guild.members.fetch(userId);
        if (user) {
            user.send({
                content: `تم الرد على اقتراحك ب${decision.replace('✅ ', '').replace('❌ ', '')}.\n**السبب:** ${reason}\n\n🔗 **رابط الاقتراح:** [اضغط هنا](https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${interaction.message.id})`
            }).catch(console.error);
        }

        const logChannel = interaction.guild.channels.cache.get(suggestionLogChannelId);
        if (logChannel) {
            const suggestionText = originalEmbed.description.replace('**الاقتراح:**\n', '');
            const suggestionAuthorId = interaction.customId.split('_')[1]; // استخدم الـ ID فقط
            const suggestionAuthor = await interaction.guild.members.fetch(suggestionAuthorId);

            const logEmbed = new EmbedBuilder()
                .setColor(decisionColor)
                .setTitle('📌 تم الرد على اقتراح')
                .setDescription(`📝 **الاقتراح:**\n${suggestionText}`)
                .addFields(
                    { name: '👤 الإداري المسؤول', value: `**${interaction.user.tag}** - **ID:** ${interaction.user.id}`, inline: true },
                    { name: '🆔 صاحب الاقتراح', value: `**${suggestionAuthor.tag}** - **ID:** ${suggestionAuthor.id}`, inline: true },
                    { name: '📌 الحالة', value: `**${decision}**`, inline: true },
                    { name: '✍️ السبب', value: `**${reason}**`, inline: false },
                    { name: '🔗 رابط الاقتراح', value: `[اضغط هنا](https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${interaction.message.id})` }
                )
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .setFooter({ text: '📅 تم الرد في', iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        }
    });
};
