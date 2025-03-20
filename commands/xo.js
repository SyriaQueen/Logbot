const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const config = require('../config.js');

const activeGames = new Map();
const gameMessages = new Map();

module.exports = {
    name: 'xo',
    description: 'لعبة إكس أو مع لاعب آخر',
    async execute(message, args, client) {
        if (activeGames.has(message.channel.id)) {
            return message.reply('يوجد لعبة نشطة بالفعل في هذه القناة!');
        }

        const opponent = message.mentions.users.first();
        if (!opponent || opponent.bot || opponent.id === message.author.id) {
            return message.reply('استخدام خاطئ! مثال: `!xo @اللاعب`');
        }

        const startEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('تحدي إكس أو!')
            .setDescription(`${opponent}, ${message.author} يتحداك في لعبة XO!\nاضغط الزر خلال 60 ثانية للقبول`);

        const startButton = new ButtonBuilder()
            .setCustomId('accept_xo')
            .setLabel('قبول التحدي')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(startButton);
        const startMessage = await message.channel.send({ 
            embeds: [startEmbed], 
            components: [row] 
        });

        const filter = i => i.user.id === opponent.id && i.customId === 'accept_xo';
        const collector = startMessage.createMessageComponentCollector({ 
            filter,
            componentType: ComponentType.Button,
            time: 60000 
        });

        collector.on('collect', async i => {
            await startMessage.delete();
            await initializeGame(message, opponent, client);
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                startMessage.edit({ 
                    content: 'انتهى وقت قبول التحدي!', 
                    components: [] 
                });
            }
        });
    }
};

async function initializeGame(message, opponent, client) {
    const board = Array(9).fill(null);
    const players = {
        [message.author.id]: '❌',
        [opponent.id]: '⭕'
    };
    let currentPlayer = message.author.id;

    const gameEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🎮 دور ${message.author.username} (❌)`)
        .setDescription('استخدم الأزرار أدناه للعب!');

    const rows = [];
    for (let i = 0; i < 9; i += 3) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            const index = i + j;
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`cell_${index}`)
                    .setLabel('ـ')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        rows.push(row);
    }

    const gameMessage = await message.channel.send({ 
        embeds: [gameEmbed], 
        components: rows 
    });

    activeGames.set(message.channel.id, { board, players, currentPlayer, gameMessage });
    gameMessages.set(gameMessage.id, message.channel.id);

    const collector = gameMessage.createMessageComponentCollector({ 
        componentType: ComponentType.Button,
        time: 600000 
    });

    collector.on('collect', async i => {
        await handleMove(i, message.channel, client);
    });

    collector.on('end', () => {
        cleanupGame(message.channel.id, gameMessage);
    });

    client.on('messageDelete', async deleted => {
        if (gameMessages.has(deleted.id)) {
            cleanupGame(message.channel.id, gameMessage);
            message.channel.send('🚫 تم إلغاء اللعبة بسبب حذف الرسالة!');
        }
    });
}

async function handleMove(interaction, channel, client) {
    const game = activeGames.get(channel.id);
    if (!game) return;

    const playerId = interaction.user.id;
    if (playerId !== game.currentPlayer) {
        return interaction.reply({ 
            content: 'ليس دورك الآن!', 
            ephemeral: true 
        });
    }

    const cellIndex = parseInt(interaction.customId.split('_')[1]);
    if (game.board[cellIndex] !== null) {
        return interaction.reply({ 
            content: 'الخلية محجوزة!', 
            ephemeral: true 
        });
    }

    game.board[cellIndex] = game.players[playerId];
    game.currentPlayer = Object.keys(game.players).find(id => id !== playerId);

    const updatedComponents = interaction.message.components.map(row => {
        return new ActionRowBuilder().addComponents(
            row.components.map(button => {
                const index = parseInt(button.customId.split('_')[1]);
                return game.board[index] 
                    ? ButtonBuilder.from(button)
                        .setLabel(game.board[index])
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                    : ButtonBuilder.from(button);
            })
        );
    });

    const winner = checkWinner(game.board);
    if (winner) {
        const result = winner === 'draw' 
            ? '**تعادل!** 😐' 
            : `**فاز ${winner === '❌' ? interaction.user : client.users.cache.get(game.currentPlayer)}!** 🎉`;
        
        const resultEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('نتيجة اللعبة')
            .setDescription(result);

        await interaction.update({ 
            embeds: [resultEmbed], 
            components: updatedComponents 
        });
        cleanupGame(channel.id, interaction.message);
        return;
    }

    const nextPlayer = client.users.cache.get(game.currentPlayer);
    const gameEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🎮 دور ${nextPlayer.username} (${game.players[game.currentPlayer]})`)
        .setDescription('استخدم الأزرار أدناه للعب!');

    await interaction.update({ 
        embeds: [gameEmbed], 
        components: updatedComponents 
    });
}

function checkWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6] // Diagonals
    ];

    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }

    return board.includes(null) ? null : 'draw';
}

function cleanupGame(channelId, gameMessage) {
    activeGames.delete(channelId);
    gameMessages.delete(gameMessage.id);
    if (!gameMessage.deleted) {
        gameMessage.edit({ components: [] }).catch(() => {});
    }
}
