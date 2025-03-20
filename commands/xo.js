const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.js'); // تأكدي أن لديك ملف config.js يحتوي على البريفكس
const PREFIX = config.PREFIX;

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        if (!message.content.startsWith(`${PREFIX}xo`) || message.author.bot) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const opponent = message.mentions.users.first();
        if (!opponent || opponent.id === message.author.id || opponent.bot) {
            return message.reply('يجب عليكِ الإشارة إلى لاعب آخر لبدء اللعبة!');
        }

        const board = ['⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜'];
        const players = [
            { user: message.author, symbol: '❌' },
            { user: opponent, symbol: '⭕' }
        ];
        let turn = 0;
        let winner = null;

        function renderBoard() {
            return `\`\`\`
${board[0]} | ${board[1]} | ${board[2]}
---------
${board[3]} | ${board[4]} | ${board[5]}
---------
${board[6]} | ${board[7]} | ${board[8]}
\`\`\``;
        }

        const embed = new EmbedBuilder()
            .setColor(0x00B2FF)
            .setTitle('لعبة XO')
            .setDescription(renderBoard())
            .addFields({ name: 'الدور الحالي', value: `<@${players[turn].user.id}> (${players[turn].symbol})` });

        const row = new ActionRowBuilder();
        for (let i = 0; i < 9; i++) {
            row.addComponents(new ButtonBuilder()
                .setCustomId(`xo_${i}`)
                .setLabel((i + 1).toString())
                .setStyle(ButtonStyle.Secondary));
        }

        const gameMessage = await message.channel.send({ embeds: [embed], components: [row] });

        const filter = (interaction) => interaction.customId.startsWith('xo_') && 
            (interaction.user.id === players[0].user.id || interaction.user.id === players[1].user.id);
        const collector = gameMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== players[turn].user.id) {
                return interaction.reply({ content: 'ليس دورك!', ephemeral: true });
            }

            const index = parseInt(interaction.customId.split('_')[1]);
            if (board[index] !== '⬜') {
                return interaction.reply({ content: 'هذه الخانة مشغولة!', ephemeral: true });
            }

            board[index] = players[turn].symbol;
            winner = checkWinner();

            if (winner || !board.includes('⬜')) {
                collector.stop();
            } else {
                turn = 1 - turn;
            }

            const updatedEmbed = EmbedBuilder.from(embed)
                .setDescription(renderBoard())
                .spliceFields(0, 1, { name: 'الدور الحالي', value: winner ? `الفائز: <@${winner.user.id}> 🎉` : `<@${players[turn].user.id}> (${players[turn].symbol})` });

            await interaction.update({ embeds: [updatedEmbed] });

            if (winner || !board.includes('⬜')) {
                gameMessage.edit({ components: [] });
            }
        });

        function checkWinner() {
            const lines = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8], // صفوف
                [0, 3, 6], [1, 4, 7], [2, 5, 8], // أعمدة
                [0, 4, 8], [2, 4, 6]             // أقطار
            ];
            for (const [a, b, c] of lines) {
                if (board[a] !== '⬜' && board[a] === board[b] && board[a] === board[c]) {
                    return players.find(p => p.symbol === board[a]);
                }
            }
            return null;
        }
    });
};
