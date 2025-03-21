// commands/faster.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config.js');

const words = [
    'امبيد',
    'ديسكورد',
    'بوت',
    'جافاسكربت',
    'تذكرة',
    'دعم',
    'برمجة',
    'خادم'
];

const activeGames = new Map();
let deletionListenerAdded = false;

module.exports = {
    name: 'أسرع',
    async execute(message, args, client) {
        if (!deletionListenerAdded) {
            client.on('messageDelete', (deletedMessage) => {
                for (const [channelId, gameData] of activeGames) {
                    if (deletedMessage.id === gameData.messageId) {
                        clearInterval(gameData.interval);
                        activeGames.delete(channelId);
                        deletedMessage.channel.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setTitle('🚫 تم إلغاء الجولة')
                                    .setDescription('تم حذف رسالة اللعبة الرئيسية!')
                            ]
                        });
                        break;
                    }
                }
            });
            deletionListenerAdded = true;
        }

        if (activeGames.has(message.channel.id)) {
            return message.reply({ 
                content: '⏳ يوجد لعبة نشطة حالياً!',
                allowedMentions: { repliedUser: false }
            });
        }

        const targetWord = words[Math.floor(Math.random() * words.length)];
        const timeLimit = 15000;
        let timeLeft = Math.floor(timeLimit / 1000);

        const gameEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('⚡ سباق السرعة - AMBED')
            .setDescription(`**أول شخص يكتب الكلمة التالية يفوز:**\n\`\`\`${targetWord}\`\`\``)
            .addFields(
                { name: '⏳ الوقت المتبقي', value: `${timeLeft} ثانية`, inline: true },
                { name: '🎯 الحالة', value: 'جارية', inline: true }
            )
            .setFooter({ text: `بدأت بواسطة: ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

        const sentMessage = await message.channel.send({ embeds: [gameEmbed] });

        const updateTimer = setInterval(() => {
            timeLeft--;
            gameEmbed.spliceFields(0, 1, { 
                name: '⏳ الوقت المتبقي', 
                value: `${timeLeft} ثانية`, 
                inline: true 
            });
            sentMessage.edit({ embeds: [gameEmbed] });
        }, 1000);

        const gameData = {
            messageId: sentMessage.id,
            targetWord,
            startTime: Date.now(),
            interval: updateTimer,
            winner: null
        };
        activeGames.set(message.channel.id, gameData);

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot,
            time: timeLimit
        });

        collector.on('collect', (msg) => {
            if (gameData.winner) return;
            
            if (msg.content.toLowerCase() === targetWord.toLowerCase()) {
                gameData.winner = msg.author;
                const timeTaken = ((Date.now() - gameData.startTime) / 1000).toFixed(2);
                
                gameEmbed
                    .spliceFields(1, 1, { name: '🎯 الحالة', value: 'منتهية' })
                    .setColor('#57F287');

                const winEmbed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle(`🎉 ${msg.author.username} فاز!`)
                    .addFields(
                        { name: 'الكلمة', value: targetWord, inline: true },
                        { name: 'الوقت', value: `${timeTaken} ثانية`, inline: true },
                        { name: 'الدقة', value: `${calculateAccuracy(timeTaken)}%`, inline: true }
                    )
                    .setThumbnail(msg.author.displayAvatarURL());

                sentMessage.reply({ embeds: [winEmbed] });
                collector.stop();
            }
        });

        collector.on('end', async () => {
            if (activeGames.has(message.channel.id)) {
                clearInterval(gameData.interval);
                activeGames.delete(message.channel.id);

                gameEmbed
                    .spliceFields(0, 1, { name: '⏳ الوقت المتبقي', value: '0 ثانية' })
                    .spliceFields(1, 1, { name: '🎯 الحالة', value: 'منتهية' })
                    .setColor(gameData.winner ? '#57F287' : '#ED4245');

                await sentMessage.edit({ embeds: [gameEmbed] });

                if (!gameData.winner) {
                    await sentMessage.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#ED4245')
                                .setTitle('⏰ انتهى الوقت!')
                                .setDescription(`لم يفز أحد!\nالكلمة كانت: \`${targetWord}\``)
                        ]
                    });
                }
            }
        });
    }
};

function calculateAccuracy(timeTaken) {
    return Math.max(0, 100 - Math.floor((timeTaken / 15) * 100));
            }
