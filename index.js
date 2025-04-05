const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// أنظمة التخزين
client.commands = new Map();
client.warnings = new Map();
client.autoReplies = new Map();

// دالة قراءة الأوامن العاودية
function readCommands(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let commandFiles = [];
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            commandFiles = commandFiles.concat(readCommands(fullPath));
        } else if (file.isFile() && file.name.endsWith('.js')) {
            commandFiles.push(fullPath);
        }
    }
    return commandFiles;
}

// تحميل الأوامر
const commandFiles = readCommands(path.join(__dirname, 'commands'));
for (const filePath of commandFiles) {
    const command = require(filePath);
    client.commands.set(command.name, command);
    if (command.aliases) {
        command.aliases.forEach(alias => {
            client.commands.set(alias, command);
        });
    }
}

// الأحداث الأساسية
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} جاهز للعمل!`);
});

// نظام الرد التلقائي المطور
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // الجزء الجديد: نظام الردود المتقدم
    if (client.autoReplies.has(message.guild.id)) {
        const content = message.content.toLowerCase();
        const guildReplies = client.autoReplies.get(message.guild.id);
        
        for (const [id, replyData] of guildReplies) {
            if (replyData.triggers.some(trigger => content.includes(trigger))) {
                await message.reply(replyData.response);
                return;
            }
        }
    }

    // الأوامر العادية
    if (!message.content.startsWith(config.PREFIX)) return;
    
    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(error);
        message.reply('❌ حدث خطأ أثناء التنفيذ!');
    }
});

// نظام التفاعلات المطور
client.on('interactionCreate', async (interaction) => {
    // معالجة المودالات
    if (interaction.isModalSubmit()) {
        const command = client.commands.get('autoreply');
        if (command?.handleModal) await command.handleModal(interaction, client);
    }

    // معالجة الأزرار والقوائم
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        const command = client.commands.get('autoreply');
        if (command?.handleInteractions) await command.handleInteractions(interaction, client);
    }
});

// تحميل الأحداث الخارجية
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    event(client);
}

// خادم ويب (بدون تغيير)
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('البوت يعمل!'));
app.listen(10000, () => console.log('🌐 الخادم يعمل على المنفذ 10000'));

// نظام الإبقاء على التشغيل (بدون تغيير)
setInterval(() => console.log("🟢 البوت يعمل..."), 5 * 60 * 1000);

client.login(config.TOKEN);
