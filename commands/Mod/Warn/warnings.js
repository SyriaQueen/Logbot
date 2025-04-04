const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'warnings',
  description: 'عرض تحذيرات العضو',
  async execute(message, args, client) {
    const user = message.mentions.users.first();
    if (!user) return message.reply('رجاءً حددي عضوًا لعرض تحذيراته.');

    const warnings = client.warningsCache.filter(w => w.userId === user.id);
    if (warnings.length === 0) return message.reply('ما في أي تحذيرات لهذا العضو.');

    let page = 0;
    const maxPerPage = 1;
    const totalPages = Math.ceil(warnings.length / maxPerPage);

    const generateEmbed = (index) => {
      const warning = warnings[index];
      return new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle(`تحذير رقم ${index + 1} من ${warnings.length}`)
        .addFields(
          { name: 'العضو', value: `<@${warning.userId}>`, inline: true },
          { name: 'المشرف', value: `<@${warning.moderatorId}>`, inline: true },
          { name: 'السبب', value: warning.reason },
          { name: 'التاريخ', value: `<t:${Math.floor(new Date(warning.date).getTime() / 1000)}:f>` }
        );
    };

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('السابق').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('next').setLabel('التالي').setStyle(ButtonStyle.Primary),
      );

    const msg = await message.reply({ embeds: [generateEmbed(page)], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 60_000 });

    collector.on('collect', async interaction => {
      if (interaction.user.id !== message.author.id) return interaction.reply({ content: 'هالأزرار مو إلك.', ephemeral: true });

      if (interaction.customId === 'prev' && page > 0) page--;
      else if (interaction.customId === 'next' && page < totalPages - 1) page++;

      await interaction.update({ embeds: [generateEmbed(page)] });
    });
  }
};
