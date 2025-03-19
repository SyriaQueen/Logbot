const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, PermissionsBitField, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');

module.exports = {
    name: 'تذكرة',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('ليس لديك صلاحية "إدارة الخادم" لاستخدام هذا الأمر.');
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('طلب دعم فني')
            .setDescription('اضغط على الزر أدناه لفتح تذكرة دعم.')
            .addFields(
                { name: 'معلومات', value: 'بإمكانك فتح تذكرة لتلقي الدعم من الفريق الخاص بنا.' }
            )
            .setFooter({ text: 'يرجى الضغط على الزر لفتح التذكرة' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('فتح تذكرة')
                    .setStyle(1)
            );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton()) return;

            if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                if (interaction.customId === 'create_ticket') {
                    const modal = new ModalBuilder()
                        .setCustomId('ticket_modal')
                        .setTitle('تفاصيل التذكرة');

                    const textInput = new TextInputBuilder()
                        .setCustomId('ticket_details')
                        .setLabel('أدخل تفاصيل التذكرة')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);

                    const row = new ActionRowBuilder().addComponents(textInput);
                    modal.addComponents(row);

                    await interaction.showModal(modal);
                }
            } else {
                interaction.reply({ content: 'أنت لا تملك صلاحية "إدارة الخادم" لفتح التذكرة.', flags: 64 });
            }
        });

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isModalSubmit()) return;

            if (interaction.customId === 'ticket_modal') {
                const ticketDetails = interaction.fields.getTextInputValue('ticket_details');
                const config = require('../config.js');
                const categoryId = config.TICKET_CATEGORY_ID;
                const guild = interaction.guild;

                try {
                    const channel = await guild.channels.create({
                        name: `ticket-${interaction.user.username}`,
                        type: ChannelType.GuildText,
                        parent: categoryId,
                        topic: `تذكرة دعم من قبل ${interaction.user.tag}`,
                        permissionOverwrites: [
                            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
                        ]
                    });

                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('تم فتح تذكرة دعم')
                        .setDescription(`تفاصيل التذكرة: ${ticketDetails}`)
                        .addFields({ name: 'إجراء', value: 'يمكنك استخدام الأزرار لتحديد الإجراء الذي تود اتخاذه.' });

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('close_ticket')
                                .setLabel('إغلاق التذكرة')
                                .setStyle(4),
                            new ButtonBuilder()
                                .setCustomId('receive_ticket')
                                .setLabel('استلام التذكرة')
                                .setStyle(3)
                        );

                    await channel.send({ embeds: [embed], components: [row] });

                    const logChannel = client.channels.cache.get(config.TICKET_CHANNEL_ID);
                    const logEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('تم فتح تذكرة جديدة')
                        .setDescription(`تم فتح تذكرة جديدة من قبل <@${interaction.user.id}> في القناة <#${channel.id}>`)
                        .addFields({ name: 'تفاصيل التذكرة', value: ticketDetails });

                    await logChannel.send({ embeds: [logEmbed] });

                    interaction.reply({
                        content: `تم إنشاء التذكرة بنجاح في القناة <#${channel.id}>.`,
                        flags: 64
                    });
                } catch (error) {
                    console.error('حدث خطأ أثناء إنشاء التذكرة:', error);
                    interaction.reply({ content: 'حدث خطأ أثناء محاولة إنشاء التذكرة.', flags: 64 });
                }
            }
        });

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton()) return;

            if (interaction.customId === 'close_ticket') {
                const channel = interaction.channel;
                const confirmationRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('confirm_close')
                            .setLabel('نعم')
                            .setStyle(4),
                        new ButtonBuilder()
                            .setCustomId('cancel_close')
                            .setLabel('تراجع')
                            .setStyle(2)
                    );

                interaction.reply({
                    content: 'هل أنت متأكد من إغلاق التذكرة؟',
                    components: [confirmationRow]
                });
            }

            if (interaction.customId === 'confirm_close') {
                const channel = interaction.channel;
                const config = require('../config.js');
                const logChannel = client.channels.cache.get(config.TICKET_CHANNEL_ID);
                const messages = await fetchMessages(channel, 500);

                let messageContent = `سجل التذكرة - ${channel.name}\n\n`;
                let attachments = [];

                messages.reverse().forEach(msg => {
                    messageContent += `**${msg.author.tag}:** ${msg.content}\n`;
                    msg.attachments.forEach(attachment => attachments.push(attachment.url));
                });

                const fileName = `ticket-${channel.name}.txt`;
                fs.writeFileSync(`./${fileName}`, messageContent);

                const embedLog = new EmbedBuilder()
                    .setColor('#FF5733')
                    .setTitle('تم إغلاق التذكرة')
                    .setDescription(`تم إغلاق التذكرة من قبل <@${interaction.user.id}> في القناة <#${channel.id}>`)
                    .addFields(
                        { name: 'عدد الرسائل المرفقة', value: messages.length.toString() },
                        { name: 'الوقت', value: new Date().toLocaleString() }
                    )
                    .setFooter({ text: 'تم إغلاق التذكرة' });

                await logChannel.send({
                    content: `تم إغلاق التذكرة من قبل <@${interaction.user.id}> في القناة ${channel.name}`,
                    files: [{ attachment: `./${fileName}`, name: fileName }],
                    embeds: [embedLog]
                });

                await channel.delete();
            }

            if (interaction.customId === 'cancel_close') {
                const messageToEdit = await interaction.message.fetch();
                await messageToEdit.edit({
                    content: 'تم إلغاء عملية الإغلاق.',
                    components: []
                });
                interaction.reply({ content: 'تم إلغاء عملية الإغلاق.', flags: 64 });
            }

            if (interaction.customId === 'receive_ticket') {
                const channel = interaction.channel;
                const config = require('../config.js');

                await interaction.update({
                    content: 'تم استلام التذكرة بنجاح.',
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('close_ticket')
                                    .setLabel('إغلاق التذكرة')
                                    .setStyle(4),
                                new ButtonBuilder()
                                    .setCustomId('receive_ticket')
                                    .setLabel('استلام التذكرة')
                                    .setStyle(3)
                                    .setDisabled(true)
                            )
                    ]
                });

                const logChannel = client.channels.cache.get(config.TICKET_CHANNEL_ID);
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('تم استلام التذكرة')
                    .setDescription(`تم استلام التذكرة بنجاح من قبل <@${interaction.user.id}> في القناة ${channel.name}.`)
                    .setFooter({ text: 'تمت معالجتها بنجاح' });

                await logChannel.send({ embeds: [embed] });
                interaction.reply({ content: 'تم استلام التذكرة بنجاح.', flags: 64 });
            }
        });
    }
};

async function fetchMessages(channel, limit = 100) {
    let messages = [];
    let lastMessageId = null;

    while (messages.length < limit) {
        const options = { limit: 100 };
        if (lastMessageId) options.before = lastMessageId;

        const fetchedMessages = await channel.messages.fetch(options);
        if (fetchedMessages.size === 0) break;

        messages = messages.concat(Array.from(fetchedMessages.values()));
        lastMessageId = fetchedMessages.last().id;
    }

    return messages.slice(0, limit);
}
