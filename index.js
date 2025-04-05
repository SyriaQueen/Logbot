const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // إضافة إذا كنت تستخدم صلاحيات الأعضاء
    ]
});

// أنظمة التخزين
client.commands = new Map();
client.warnings = new Map();
client.autoReplies = new Map(); // <-- أهم إضافة

// دالة قراءة الملفات بشكل عاودي
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

// الأحداث
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} جاهز للعمل!`);
});

// نظام الرد التلقائي
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // الجزء الجديد: الردود التلقائية
    const guildReplies = client.autoReplies.get(message.guild.id);
    if (guildReplies) {
        const content = message.content.toLowerCase();
        for (const [trigger, response] of guildReplies) {
            if (content.includes(trigger)) {
                await message.reply(response);
                return; // توقف بعد أول تطابق
            }
        }
    }

    // الأوامر العادية
    if (!message.content.startsWith(config.PREFIX)) return;
    
    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!client.commands.has(commandName)) return;

    const command = client.commands.get(commandName);
    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(error);
        message.reply('❌ حدث خطأ أثناء التنفيذ!');
    }
});

// نظام التفاعلات (للحذف)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    
    const command = client.commands.get('autoreply');
    if (command?.handleInteractions) {
        await command.handleInteractions(interaction, client);
    }
});

// تحميل الأحداث الخارجية
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    event(client);
}

// خادم ويب
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('البوت يعمل!'));
app.listen(10000, () => console.log('🌐 الخادم يعمل على المنفذ 10000'));

// إبقاء البوت نشطًا
setInterval(() => console.log("🟢 البوت يعمل..."), 5 * 60 * 1000);

client.login(config.TOKEN);
