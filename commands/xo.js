const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.js');

// تخزين الألعاب النشطة
const activeGames = new Map();

module.exports = {
    name: 'xo',
    description: 'ابدأ لعبة تيك تاك تو (X O) مع لاعب آخر',
    async execute(message, args, client) {
        // التحقق من المنشن
        const opponent = message.mentions.users.first();
        if (!opponent || opponent.bot || opponent.id === message.author.id) {
            return message.reply('الرجاء تحديد لاعب حقيقي لتحديه! مثال: `!xo @اللاعب`');
        }

        // التحقق من وجود لعبة نشطة
        if (activeGames.has(message.channel.id)) {
            return message.reply('هناك لعبة نشطة بالفعل في هذه القناة!');
        }

        // إنشاء لوحة اللعبة
        const gameBoard = Array(9).fill(null);
        let currentPlayer = message.author;

        // إنشاء زر البداية
        const startRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('start_xo')
                .setLabel('بدء اللعبة!')
                .setStyle(ButtonStyle.Primary)
        );

        // إرسال رسالة البداية
        const startEmbed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('تحدي تيك تاك تو!')
            .setDescription(`${message.author} يتحدى ${opponent}!\nاضغط الزر لبدء اللعبة!`);

        const startMessage = await message.channel.send({
            embeds: [startEmbed],
            components: [startRow]
        });

        // معالجة بدء اللعبة
        const filter = i => i.customId === 'start_xo' && i.user.id === opponent.id;
        const collector = startMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            // حذف رسالة البداية
            await startMessage.delete();

            // إنشاء اللوحة التفاعلية
            const boardEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`🎮 دور ${currentPlayer.tag}`)
                .setDescription('استخدم الأزرار للعب!');

            // إنشاء أزرار اللوحة
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    const index = i * 3 + j;
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`cell_${index}`)
                            .setLabel('ـ')
                            .setStyle(ButtonStyle.Secondary)
                    );
                }
                rows.push(row);
            }

            // إرسال لوحة اللعبة
            const gameMessage = await message.channel.send({
                embeds: [boardEmbed],
                components: rows
            });

            // حفظ حالة اللعبة
            activeGames.set(message.channel.id, {
                board: gameBoard,
                players: [message.author.id, opponent.id],
                currentPlayer: message.author.id,
                gameMessage
            });

            // معالجة النقرات على الأزرار
            const gameCollector = gameMessage.createMessageComponentCollector({ 
                componentType: 'BUTTON',
                time: 600000 // 10 دقائق
            });

            gameCollector.on('collect', async i => {
                if (![message.author.id, opponent.id].includes(i.user.id)) {
                    return i.reply({ content: 'ليس دورك للعب!', ephemeral: true });
                }

                if (i.user.id !== activeGames.get(message.channel.id).currentPlayer) {
                    return i.reply({ content: 'ليس دورك الآن!', ephemeral: true });
                }

                const cellIndex = parseInt(i.customId.split('_')[1]);
                const gameData = activeGames.get(message.channel.id);

                if (gameData.board[cellIndex] !== null) {
                    return i.reply({ content: 'هذه الخلية محجوزة!', ephemeral: true });
                }

                // تحديث اللوحة
                const symbol = gameData.currentPlayer === message.author.id ? '❌' : '⭕';
                gameData.board[cellIndex] = symbol;
                
                // تحديث الأزرار
                const updatedComponents = i.message.components.map(row => {
                    return new ActionRowBuilder().addComponents(
                        row.components.map(button => {
                            const btnIndex = parseInt(button.customId.split('_')[1]);
                            if (btnIndex === cellIndex) {
                                return new ButtonBuilder()
                                    .setCustomId(button.customId)
                                    .setLabel(symbol)
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(true);
                            }
                            return ButtonBuilder.from(button);
                        })
                    );
                });

                // التحقق من الفوز
                const winner = checkWinner(gameData.board);
                if (winner) {
                    activeGames.delete(message.channel.id);
                    gameCollector.stop();
                    
                    const resultEmbed = new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setTitle(winner === 'draw' ? 'تعادل!' : `🎉 فوز ${symbol}!`)
                        .setDescription(winner === 'draw' 
                            ? 'اللعبة انتهت بالتعادل!' 
                            : `${i.user} فاز باللعبة!`);

                    return i.update({
                        embeds: [resultEmbed],
                        components: updatedComponents
                    });
                }

                // تبديل اللاعب
                gameData.currentPlayer = gameData.currentPlayer === message.author.id 
                    ? opponent.id 
                    : message.author.id;

                // تحديث الرسالة
                const updatedEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(`🎮 دور ${gameData.currentPlayer === message.author.id ? message.author.tag : opponent.tag}`)
                    .setDescription('استخدم الأزرار للعب!');

                await i.update({
                    embeds: [updatedEmbed],
                    components: updatedComponents
                });
            });

            gameCollector.on('end', () => {
                if (activeGames.has(message.channel.id)) {
                    activeGames.delete(message.channel.id);
                    gameMessage.edit({ components: [] });
                }
            });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                startMessage.edit({ 
                    content: 'انتهى وقت بدء اللعبة!',
                    components: [] 
                });
            }
        });
    }
};

function checkWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // صفوف
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // أعمدة
        [0, 4, 8], [2, 4, 6] // أقلمة
    ];

    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }

    if (board.every(cell => cell !== null)) return 'draw';
    return null;
                    }
