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

// دالة تحميل الأوامر العاودية
function loadCommands(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let commands = [];
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            commands = commands.concat(loadCommands(fullPath));
        } else if (file.name.endsWith('.js')) {
            commands.push(fullPath);
        }
    }
    return commands;
}

// تحميل الأوامر
loadCommands(path.join(__dirname, 'commands')).forEach(filePath => {
    const command = require(filePath);
    client.commands.set(command.name, command);
    if (command.aliases) {
        command.aliases.forEach(alias => client.commands.set(alias, command));
    }
});

// تحميل الأحداث الخارجية (التصحيح هنا)
const loadEvents = () => {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
};
loadEvents();

// الأحداث الأساسية
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} جاهز للعمل!`);
});

// نظام التفاعلات
client.on('interactionCreate', async interaction => {
    // المودالات
    if (interaction.isModalSubmit()) {
        const command = client.commands.get('autoreply');
        if (command?.handleModal) await command.handleModal(interaction, client);
    }
    
    // الأزرار والقوائم
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        const command = client.commands.get('autoreply');
        if (command?.handleInteractions) await command.handleInteractions(interaction, client);
    }
});

// خادم ويب
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('🤖 البوت يعمل!'));
app.listen(3000, () => console.log('🌐 الخادم: http://localhost:3000'));

client.login(config.TOKEN);
