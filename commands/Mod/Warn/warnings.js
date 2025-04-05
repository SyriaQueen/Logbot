const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const config = require('../../../config.js');

module.exports = {
    name: 'warnings',
    async execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        const guildWarns = client.warnings.get(message.guild.id)?.users?.get(target.id);

        if (!guildWarns?.length) {
            return message.reply('❌ لا يوجد تحذيرات');
        }

        let page = 0;
        const maxPage = Math.ceil(guildWarns.length / 5);

        const updateEmbed = () => {
            return new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`سجل التحذيرات - ${target.tag}`)
                .setDescription(guildWarns
                    .slice(page * 5, (page + 1) * 5)
                    .map(w => `**#${w.id}** <t:${Math.floor(w.date/1000)}>\n${w.reason}`)
                    .join('\n\n'))
                .setFooter({ text: `الصفحة ${page + 1}/${maxPage}` });
        };

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('السابق')
                .setStyle(2)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('التالي')
                .setStyle(2)
                .setDisabled(page >= maxPage - 1)
        );

        const msg = await message.reply({ 
            embeds: [updateEmbed()], 
            components: [buttons] 
        });

        const filter = i => i.user.id === message.author.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'prev') page--;
            if (i.customId === 'next') page++;

            buttons.components[0].setDisabled(page === 0);
            buttons.components[1].setDisabled(page >= maxPage - 1);

            await i.update({
                embeds: [updateEmbed()],
                components: [buttons]
            });
        });
    }
};
