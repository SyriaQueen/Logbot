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
            client.on('messageDelete', async (deletedMessage) => {
                const gameData = activeGames.get(deletedMessage.channelId);
                if (gameData && deletedMessage.id === gameData.messageId) {
                    clearInterval(gameData.interval);
                    activeGames.delete(deletedMessage.channelId);
                    try {
                        await deletedMessage.channel.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('#FF0000')
                                    .setTitle('🚫 تم إلغاء الجولة')
                                    .setDescription('تم حذف رسالة اللعبة الرئيسية!')
                            ]
                        });
                    } catch (err) {
                        console.error('Error handling message deletion:', err);
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

        let sentMessage;
        try {
            sentMessage = await message.channel.send({ embeds: [gameEmbed] });
        } catch (err) {
            console.error('Failed to send game message:', err);
            return;
        }

        const updateTimer = setInterval(async () => {
            if (!activeGames.has(message.channel.id)) return;
            
            timeLeft--;
            try {
                gameEmbed.spliceFields(0, 1, { 
                    name: '⏳ الوقت المتبقي', 
                    value: `${timeLeft} ثانية`, 
                    inline: true 
                });
                await sentMessage.edit({ embeds: [gameEmbed] });
            } catch (err) {
                console.error('Failed to update game message:', err);
                clearInterval(updateTimer);
                activeGames.delete(message.channel.id);
            }
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

        collector.on('collect', async (msg) => {
            if (gameData.winner) return;
            
            if (msg.content.toLowerCase() === targetWord.toLowerCase()) {
                gameData.winner = msg.author;
                const timeTaken = ((Date.now() - gameData.startTime) / 1000).toFixed(2);
                
                try {
                    gameEmbed
                        .spliceFields(1, 1, { name: '🎯 الحالة', value: 'منتهية' })
                        .setColor('#ED4245');
                    await sentMessage.edit({ embeds: [gameEmbed] });

                    const winEmbed = new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle(`🎉 فوز!`)
                        .setDescription(`أجبت بشكل صحيح خلال ${timeTaken} ثانية`)
                        .addFields(
                            { name: 'الكلمة', value: targetWord, inline: true },
                            { name: 'الفائز', value: msg.author.toString(), inline: true }
                        );

                    await msg.reply({ 
                        embeds: [winEmbed],
                        allowedMentions: { repliedUser: false }
                    });
                } catch (err) {
                    console.error('Error handling win:', err);
                } finally {
                    collector.stop();
                }
            }
        });

        collector.on('end', async () => {
            if (activeGames.has(message.channel.id)) {
                clearInterval(gameData.interval);
                activeGames.delete(message.channel.id);

                try {
                    gameEmbed
                        .spliceFields(0, 1, { name: '⏳ الوقت المتبقي', value: '0 ثانية' })
                        .spliceFields(1, 1, { name: '🎯 الحالة', value: 'منتهية' })
                        .setColor('#ED4245');
                    
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
                } catch (err) {
                    console.error('Error finalizing game:', err);
                }
            }
        });
    }
};
