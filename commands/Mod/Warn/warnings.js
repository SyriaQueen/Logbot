const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const config = require('../../../config.js');

module.exports = {
    name: 'warnings',
    aliases: ['التحذيرات', 'انذارات', 'الإنذارات'],
    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        const guildData = client.warnings.get(message.guild.id);
        
        if (!guildData?.users?.has(target.id)) {
            return message.reply({ content: '❌ لا يوجد تحذيرات!' });
        }

        const warnings = guildData.users.get(target.id);
        let currentPage = 0;
        const maxPage = Math.ceil(warnings.length / 5);

        const generateEmbed = () => new EmbedBuilder()
            .setColor(0x2F3136)
            .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() })
            .setTitle(`📂 سجل التحذيرات (${warnings.length})`)
            .setDescription(
                warnings
                    .slice(currentPage * 5, (currentPage + 1) * 5)
                    .map(w => `**#${w.id}** - <t:${Math.floor(w.date/1000)}:R>\n» ${w.reason.substring(0, 45)}${w.reason.length > 45 ? '...' : ''}\n» بواسطة: <@${w.moderator}>`)
                    .join('\n\n')
            )
            .setFooter({ text: `الصفحة ${currentPage + 1}/${maxPage}`, iconURL: message.guild.iconURL() });

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('السابق')
                .setStyle(2)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('التالي')
                .setStyle(2)
                .setDisabled(currentPage >= maxPage - 1)
        );

        const msg = await message.reply({ embeds: [generateEmbed()], components: [buttons] });
        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return;
            i.customId === 'prev' ? currentPage-- : currentPage++;
            buttons.components[0].setDisabled(currentPage === 0);
            buttons.components[1].setDisabled(currentPage >= maxPage - 1);
            await i.update({ embeds: [generateEmbed()], components: [buttons] });
        });

        collector.on('end', () => msg.edit({ components: [buttons.setComponents(buttons.components.map(b => b.setDisabled(true)))] }));
    }
};
