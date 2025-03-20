const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const config = require('../config.js');

const activeGames = new Map();
const gameMessages = new Map();

module.exports = {
    name: 'xo',
    description: 'لعبة إكس أو مع لاعب آخر',
    async execute(message, args, client) {
        if (activeGames.has(message.channel.id)) {
            return message.reply({ content: '⚡ يوجد لعبة نشطة بالفعل هنا!' });
        }

        const opponent = message.mentions.users.first();
        if (!opponent || opponent.bot || opponent.id === message.author.id) {
            return message.reply({ content: '❌ استخدام خاطئ! مثال: `!xo @اللاعب`' });
        }

        // إنشاء واجهة التحدي
        const challengeEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🎮 تحدي إكس أو')
            .setDescription(`${opponent}، ${message.author} يدعوك للعب!\nلديك 60 ثانية للرد 🕑`);

        const acceptButton = new ButtonBuilder()
            .setCustomId('xacs')
            .setLabel('قبول التحدي')
            .setStyle(ButtonStyle.Success);

        const actionRow = new ActionRowBuilder().addComponents(acceptButton);
        const challengeMessage = await message.channel.send({ 
            embeds: [challengeEmbed], 
            components: [actionRow] 
        });

        // فلترة التفاعلات
        const filter = i => {
            if (i.user.id !== opponent.id) {
                i.reply({ content: '🚫 فقط الشخص المذكور يمكنه القبول!', flags: 64 });
                return false;
            }
            return i.customId === 'xacs';
        };

        const collector = challengeMessage.createMessageComponentCollector({ 
            filter,
            componentType: ComponentType.Button,
            time: 60_000 
        });

        collector.on('collect', async interaction => {
            await challengeMessage.delete();
            await this.initializeGame(message, opponent, client);
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                challengeMessage.edit({ 
                    content: '⌛ انتهى وقت قبول التحدي!', 
                    components: [] 
                });
            }
        });
    },

    async initializeGame(message, opponent, client) {
        const board = Array(9).fill(null);
        const players = {
            [message.author.id]: '❌',
            [opponent.id]: '⭕'
        };
        let currentPlayer = message.author.id;

        // إنشاء لوحة اللعبة
        const gameEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`🎮 دور ${message.author.username} (❌)`)
            .setFooter({ text: 'اختر خلية للعب' });

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

        // حفظ حالة اللعبة
        activeGames.set(message.channel.id, { board, players, currentPlayer, gameMessage });
        gameMessages.set(gameMessage.id, message.channel.id);

        // معالجة تفاعلات اللعبة
        const collector = gameMessage.createMessageComponentCollector({ 
            componentType: ComponentType.Button,
            time: 600_000 
        });

        collector.on('collect', async interaction => {
            await this.handleMove(interaction, message.channel, client);
        });

        collector.on('end', () => {
            this.cleanupGame(message.channel.id, gameMessage);
        });

        // مراقبة حذف الرسالة
        client.on('messageDelete', async deleted => {
            if (gameMessages.has(deleted.id)) {
                this.cleanupGame(message.channel.id, gameMessage);
                message.channel.send({ content: '❌ تم إلغاء اللعبة بسبب حذف الرسالة!' });
            }
        });
    },

    async handleMove(interaction, channel, client) {
        const game = activeGames.get(channel.id);
        if (!game) return;

        const playerId = interaction.user.id;
        
        // التحقق من صلاحية اللاعب
        if (!game.players[playerId] || playerId !== game.currentPlayer) {
            return interaction.reply({ 
                content: '⏳ ليس دورك الآن!', 
                flags: 64 
            });
        }

        const cellIndex = parseInt(interaction.customId.split('_')[1]);
        if (game.board[cellIndex] !== null) {
            return interaction.reply({ 
                content: '🔒 الخلية محجوزة!', 
                flags: 64 
            });
        }

        // تحديث اللوحة
        game.board[cellIndex] = game.players[playerId];
        game.currentPlayer = Object.keys(game.players).find(id => id !== playerId);

        // تحديث الأزرار
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

        // التحقق من الفوز
        const winner = this.checkWinner(game.board);
        if (winner) {
            const resultEmbed = new EmbedBuilder()
                .setColor(winner === 'draw' ? '#808080' : '#57F287')
                .setTitle(winner === 'draw' ? '🤝 تعادل!' : `🎉 فوز ${game.players[playerId]}!`)
                .setDescription(winner === 'draw' 
                    ? 'الجولة انتهت بدون فائز' 
                    : `${interaction.user} هو الفائز!`);

            await interaction.update({ 
                embeds: [resultEmbed], 
                components: updatedComponents 
            });
            this.cleanupGame(channel.id, interaction.message);
            return;
        }

        // تحديث الدور
        const nextPlayer = client.users.cache.get(game.currentPlayer);
        const updatedEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`🎮 دور ${nextPlayer.username} (${game.players[game.currentPlayer]})`)
            .setFooter({ text: 'اختر خلية للعب' });

        await interaction.update({ 
            embeds: [updatedEmbed], 
            components: updatedComponents 
        });
    },

    checkWinner(board) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }

        return board.includes(null) ? null : 'draw';
    },

    cleanupGame(channelId, gameMessage) {
        activeGames.delete(channelId);
        gameMessages.delete(gameMessage.id);
        if (!gameMessage.deleted) {
            gameMessage.edit({ components: [] }).catch(() => {});
        }
    }
};
