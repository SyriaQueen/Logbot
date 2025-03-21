// commands/faster.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config.js');

// قائمة الكلمات الممكنة للعبة
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

// خريطة لتتبع الألعاب النشطة (منع التكرار)
const activeGames = new Map();

module.exports = {
    name: 'أسرع',
    async execute(message, args, client) {
        // التحقق من وجود لعبة نشطة في القناة
        if (activeGames.has(message.channel.id)) {
            return message.reply('يوجد لعبة نشطة بالفعل في هذه القناة!');
        }

        // توليد كلمة عشوائية
        const targetWord = words[Math.floor(Math.random() * words.length)];
        const startTime = Date.now();

        // إنشاء إيمبد للعبة
        const gameEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎮 لعبة أسرع في أمبيد 🏁')
            .setDescription(`**اكتب الكلمة التالية بأسرع ما يمكن:**\n\`${targetWord}\``)
            .setFooter({ text: 'لديك 15 ثانية لكتابة الكورة بشكل صحيح!' });

        const sentMessage = await message.channel.send({ embeds: [gameEmbed] });

        // تحديد القناة كلعبة نشطة
        activeGames.set(message.channel.id, true);

        // إنشاء مجمع للرسائل
        const filter = m => m.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ 
            filter,
            time: 15000,
            max: 1
        });

        collector.on('collect', async (msg) => {
            const endTime = Date.now();
            const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

            if (msg.content.toLowerCase() === targetWord.toLowerCase()) {
                const winEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 فوز! 🏆')
                    .setDescription(`**${message.author.username}** أتممت التحدي بنجاح!`)
                    .addFields(
                        { name: 'الكلمة المطلوبة', value: targetWord, inline: true },
                        { name: 'الوقت المستغرق', value: `${timeTaken} ثانية`, inline: true }
                    )
                    .setThumbnail(message.author.displayAvatarURL());
                
                msg.reply({ embeds: [winEmbed] });
            } else {
                const loseEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ خسارة!')
                    .setDescription(`الإجابة الصحيحة كانت: **${targetWord}**`)
                    .setFooter({ text: 'حاول مرة أخرى!' });
                
                msg.reply({ embeds: [loseEmbed] });
            }
        });

        collector.on('end', (collected) => {
            // إزالة القناة من الألعاب النشطة
            activeGames.delete(message.channel.id);

            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⏰ انتهى الوقت!')
                    .setDescription('لم تقم بإرسال إجابة في الوقت المحدد');
                
                message.channel.send({ embeds: [timeoutEmbed] });
            }
        });
    }
};
