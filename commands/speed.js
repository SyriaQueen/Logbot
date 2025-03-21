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

module.exports = {
    name: 'أسرع',
    async execute(message, args, client) {
        if (activeGames.has(message.channel.id)) {
            return message.reply({ 
                content: '⏳ يوجد لعبة نشطة حالياً في هذه القناة!',
                allowedMentions: { repliedUser: false }
            }).then(msg => setTimeout(() => msg.delete(), 3000));
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
        if (message.deletable) message.delete().catch(() => {});

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
            answered: false
        };
        activeGames.set(message.channel.id, gameData);

        const collector = message.channel.createMessageCollector({
            filter: m => !m.author.bot,
            time: timeLimit
        });

        collector.on('collect', async (msg) => {
            if (gameData.answered) return;

            const isCorrect = msg.content.toLowerCase() === targetWord.toLowerCase();
            const timeTaken = ((Date.now() - gameData.startTime) / 1000).toFixed(2);

            if (isCorrect) {
                gameData.answered = true;
                clearInterval(gameData.interval);
                
                const winEmbed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle(`🎉 ${msg.author.username} فاز!`)
                    .addFields(
                        { name: 'الكلمة', value: targetWord, inline: true },
                        { name: 'الوقت', value: `${timeTaken} ثانية`, inline: true },
                        { name: 'الدقة', value: `${calculateAccuracy(timeTaken)}%`, inline: true }
                    )
                    .setThumbnail(msg.author.displayAvatarURL());

                gameEmbed
                    .spliceFields(1, 1, { name: '🎯 الحالة', value: 'منتهية' })
                    .setColor('#57F287');

                await sentMessage.edit({ embeds: [gameEmbed] });
                await sentMessage.reply({ embeds: [winEmbed] });
                collector.stop();
            }
        });

        collector.on('end', async () => {
            clearInterval(gameData.interval);
            activeGames.delete(message.channel.id);

            if (!gameData.answered) {
                gameEmbed
                    .spliceFields(0, 1, { name: '⏳ الوقت المتبقي', value: '0 ثانية' })
                    .spliceFields(1, 1, { name: '🎯 الحالة', value: 'منتهية' })
                    .setColor('#ED4245');

                await sentMessage.edit({ embeds: [gameEmbed] });
                await sentMessage.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ED4245')
                            .setTitle('⏰ انتهى الوقت!')
                            .setDescription(`لم يفز أحد!\nالكلمة كانت: \`${targetWord}\``)
                    ]
                });
            }
        });
    }
};

function calculateAccuracy(timeTaken) {
    return Math.max(0, 100 - Math.floor((timeTaken / 15) * 100));
}
