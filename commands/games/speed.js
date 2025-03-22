// commands/faster.js
const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

const imageQuestions = [
    {
        image: 'https://i.postimg.cc/0yPm3f2V/D3m.png',
        answer: 'دعم'
    },
    {
        image: 'https://i.postimg.cc/Mp3TDbcM/Dr3.png',
        answer: 'درع'
    },
    {
        image: 'https://i.postimg.cc/CKZK6BDv/Taam.png',
        answer: 'طعام'
    },
    // إضافة المزيد من الصور والأجوبة هنا
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

        const randomImage = imageQuestions[Math.floor(Math.random() * imageQuestions.length)];
        const timeLimit = 15000;
        let timeLeft = Math.floor(timeLimit / 1000);

        const gameEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('أسرع -')
            .setDescription('**أول شخص يكتب الكلمة التي في الصورة يفوز!**')
            .setImage(randomImage.image)
            .addFields(
                { name: '⏳ الوقت المتبقي', value: `${timeLeft} ثانية`, inline: true },
                { name: '🎯 الحالة', value: 'جارية', inline: true },
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
            correctAnswer: randomImage.answer,
            imageUrl: randomImage.image,
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
            
            if (msg.content.toLowerCase() === gameData.correctAnswer.toLowerCase()) {
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
                        .setDescription(`**الكلمة الصحيحة:** \`${gameData.correctAnswer}\``)
                        .addFields(
                            { name: 'الفائز', value: msg.author.toString(), inline: true },
                            { name: 'الوقت', value: `${timeTaken} ثانية`, inline: true }
                        )
                        .setImage(gameData.imageUrl)
                        .setThumbnail(msg.author.displayAvatarURL());

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
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor('#ED4245')
                            .setTitle('⏰ انتهى الوقت!')
                            .setDescription(`**الكلمة الصحيحة كانت:** \`${gameData.correctAnswer}\``)
                            .setImage(gameData.imageUrl);

                        await sentMessage.reply({ embeds: [timeoutEmbed] });
                    }
                } catch (err) {
                    console.error('Error finalizing game:', err);
                }
            }
        });
    }
};
