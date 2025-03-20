const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const config = require('../config.js');

module.exports = (client) => {
    const suggestionChannelId = config.SUGGESTION_CHANNEL_ID;
    const userVotes = {};

    client.on('messageCreate', async (message) => {
        if (message.channel.id !== suggestionChannelId || message.author.bot) return;

        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            console.log('العضو أدمن، لن يتم تحويل الرسالة.');
            return;
        }

        if (!message.content.trim()) {
            console.log('الرسالة فارغة، لم يتم إرسال اقتراح.');
            return;
        }

        const suggestionEmbed = new EmbedBuilder()
            .setColor(0x00B2FF)
            .setDescription(`**الاقتراح :**\n\`\`\`${message.content}\`\`\``)
            .setTimestamp()
            .setAuthor({ name: `تم الإرسال بواسطة : ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
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

            return interaction.reply({ content: 'هذه الميزة لم يتم تفعيلها بعد.', ephemeral: true });
        }

        if (interaction.customId === 'upvote' || interaction.customId === 'downvote') {
            if (!userVotes[messageId]) userVotes[messageId] = new Set();
            if (userVotes[messageId].has(userId)) {
                return interaction.reply({ content: 'لقد قمت بالتصويت على هذا الاقتراح بالفعل.', ephemeral: true });
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
};
