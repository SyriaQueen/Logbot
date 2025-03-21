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
                content: '⚠️ يوجد لعبة نشطة حالياً في هذه القناة!',
                allowedMentions: { repliedUser: false }
            });
        }

        const targetWord = words[Math.floor(Math.random() * words.length)];
        const timeLimit = 15000;
        let timeLeft = timeLimit / 1000;

        const gameEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('⚡ لعبة السرعة - أمبيد')
            .setDescription(`**أكتب الكلمة التالية بسرعة:**\n\`\`\`${targetWord}\`\`\``)
            .addFields(
                { name: 'الوقت المتبقي', value: `⏳ ${timeLeft} ثانية`, inline: true },
                { name: 'الحالة', value: '🟢 جاري التشغيل', inline: true }
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3132/3132693.png')
            .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL() });

        const sentMessage = await message.channel.send({ embeds: [gameEmbed] });
        
        // حذف رسالة الأمر الأصلية
        if (message.deletable) message.delete().catch(console.error);

        const updateTimer = setInterval(() => {
            timeLeft--;
            gameEmbed.spliceFields(0, 1, { 
                name: 'الوقت المتبقي', 
                value: `⏳ ${timeLeft} ثانية`, 
                inline: true 
            });
            
            sentMessage.edit({ embeds: [gameEmbed] });
        }, 1000);

        activeGames.set(message.channel.id, {
            messageId: sentMessage.id,
            targetWord,
            startTime: Date.now(),
            interval: updateTimer
        });

        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ 
            filter,
            time: timeLimit,
            max: 1
        });

        collector.on('collect', async (msg) => {
            const gameData = activeGames.get(message.channel.id);
            clearInterval(gameData.interval);
            
            const endTime = Date.now();
            const timeTaken = ((endTime - gameData.startTime) / 1000).toFixed(2);

            // تحديث الإيمبد الأخير
            gameEmbed
                .spliceFields(1, 1, { name: 'الحالة', value: '🔴 منتهية' })
                .setColor('#ED4245');
            
            await sentMessage.edit({ embeds: [gameEmbed] });

            if (msg.content.toLowerCase() === gameData.targetWord.toLowerCase()) {
                const winEmbed = new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('🎊 فوز مذهل!')
                    .setDescription(`**${message.author.username}** أكمل التحدي بنجاح`)
                    .addFields(
                        { name: 'الكلمة', value: gameData.targetWord, inline: true },
                        { name: 'الوقت', value: `${timeTaken} ثانية`, inline: true },
                        { name: 'الدقة', value: `${calculateAccuracy(timeTaken)}%`, inline: true }
                    )
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

                sentMessage.reply({ 
                    embeds: [winEmbed],
                    allowedMentions: { repliedUser: false }
                });
            } else {
                const loseEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ إجابة خاطئة')
                    .setDescription(`**الإجابة الصحيحة:**\n\`${gameData.targetWord}\``)
                    .setFooter({ text: 'حاول مرة أخرى!' });

                sentMessage.reply({ 
                    embeds: [loseEmbed],
                    allowedMentions: { repliedUser: false }
                });
            }
        });

        collector.on('end', (collected) => {
            const gameData = activeGames.get(message.channel.id);
            clearInterval(gameData.interval);
            activeGames.delete(message.channel.id);

            if (collected.size === 0) {
                gameEmbed
                    .spliceFields(0, 1, { 
                        name: 'الوقت المتبقي', 
                        value: `⏳ 0 ثانية`, 
                        inline: true 
                    })
                    .spliceFields(1, 1, { name: 'الحالة', value: '🔴 منتهية' })
                    .setColor('#ED4245');

                sentMessage.edit({ embeds: [gameEmbed] });

                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('⏰ انتهى الوقت!')
                    .setDescription('لم يتم إرسال إجابة خلال المدة المحددة')
                    .addFields(
                        { name: 'الكلمة المطلوبة', value: gameData.targetWord },
                        { name: 'الوقت المسموح', value: `${timeLimit/1000} ثانية` }
                    );

                sentMessage.reply({ 
                    embeds: [timeoutEmbed],
                    allowedMentions: { repliedUser: false }
                });
            }
        });
    }
};

function calculateAccuracy(timeTaken) {
    const maxTime = 15;
    const accuracy = ((maxTime - timeTaken) / maxTime) * 100;
    return Math.max(0, Math.min(100, Math.round(accuracy)));
}
