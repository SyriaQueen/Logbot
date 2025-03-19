const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Map();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log(`تم تسجيل الدخول كـ ${client.user.tag}!`);
});

// تحميل الأحداث من مجلد events
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    event(client); // تمرير client إلى كل حدث
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!client.commands.has(commandName)) return;

    const command = client.commands.get(commandName);

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(error);
        message.reply('حدث خطأ أثناء تنفيذ الأمر.');
    }
});

const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('البوت يعمل!');
});

app.listen(10000, () => {
    console.log('خادم يعمل على المنفذ 10000');
});

setInterval(() => {
    console.log("البوت يعمل...");
}, 5 * 60 * 1000);

client.login(config.TOKEN);
