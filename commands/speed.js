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
        const startTime = Date.now();
        const timeLimit = 15000;

        const gameEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('⚡ لعبة السرعة - أمبيد')
            .setDescription(`**أكتب الكلمة التالية بسرعة:**\n\`\`\`${targetWord}\`\`\``)
            .addFields(
                { name: 'المدة', value: `⏳ ${timeLimit/1000} ثواني`, inline: true },
                { name: 'الحالة', value: '🟢 جاري التشغيل', inline: true }
            )
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3132/3132693.png')
            .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL() });

        const sentMessage = await message.reply({ 
            embeds: [gameEmbed],
            allowedMentions: { repliedUser: false }
        });

        activeGames.set(message.channel.id, {
            messageId: sentMessage.id,
            targetWord,
            startTime
        });

        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ 
            filter,
            time: timeLimit,
            max: 1
        });

        collector.on('collect', async (msg) => {
            const gameData = activeGames.get(message.channel.id);
            const endTime = Date.now();
            const timeTaken = ((endTime - gameData.startTime) / 1000).toFixed(2);

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
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                msg.reply({ embeds: [winEmbed] });
            } else {
                const loseEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ إجابة خاطئة')
                    .setDescription(`**الإجابة الصحيحة:**\n\`${gameData.targetWord}\``)
                    .setFooter({ text: 'حاول مرة أخرى!' });

                msg.reply({ embeds: [loseEmbed] });
            }
        });

        collector.on('end', (collected) => {
            const gameData = activeGames.get(message.channel.id);
            activeGames.delete(message.channel.id);

            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('⏰ انتهى الوقت!')
                    .setDescription('لم يتم إرسال إجابة خلال المدة المحددة')
                    .addFields(
                        { name: 'الكلمة المطلوبة', value: gameData.targetWord },
                        { name: 'الوقت المسموح', value: `${timeLimit/1000} ثانية` }
                    );

                sentMessage.edit({ 
                    embeds: [gameEmbed
                        .spliceFields(1, 1, { name: 'الحالة', value: '🔴 منتهية' })
                        .setColor('#ED4245')
                    ] 
                });

                message.reply({ 
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
