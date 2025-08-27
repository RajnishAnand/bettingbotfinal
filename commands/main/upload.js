import { AttachmentBuilder, MessageFlags, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import config from '../../config.json' with {type: 'json'};
const { sports, winChannels, modChannelID, modRole, ourPickChannelID } = config;
import { createWatermark } from '../../lib/watermark.js';

console.log(Object.entries(sports).map(([key, { name }]) => ({
    name: name,
    value: key
})))

export const data = new SlashCommandBuilder()
    .setName('upload')
    .setDescription('Upload the screenshot.')
    .addAttachmentOption(option =>
        option.setName('screenshot')
            .setDescription('The screenshot to upload.')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('sports')
            .setDescription('The sport to upload the screenshot for.')
            .addChoices(
                ...Object.entries(sports).map(([key, { name }]) => ({
                    name: name,
                    value: key
                }))
            )
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('handle')
            .setDescription('Your handle.')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('win')
            .setDescription('Did you win?')
            .addChoices(
                { name: 'Yes', value: 'yes' },
                { name: 'No', value: 'no' }
            )
            .setRequired(true)
    )
    .addBooleanOption(option =>
        option.setName('ourpick')
            .setDescription('Only moderators can use this option.')
            .setRequired(false)
    );

export async function execute(interaction) {

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const screenshot = interaction.options.getAttachment('screenshot');
    const sport = interaction.options.getString('sports');
    const win = interaction.options.getString('win') === 'yes';
    const handle = interaction.options.getString('handle');
    const ourpick = interaction.options.getBoolean('ourpick');

    if(ourpick && !interaction.member.roles.cache.has(modRole)) {
        await interaction.editReply({ content: 'You do not have permission to use the `ourpick` option. Only moderators (Chuck, Mullet and Dub) can use this option.', flags: MessageFlags.Ephemeral });
        return;
    }

    let handleText = handle;
    if (/<@!?(\d+)>/.test(handle)) {
        let uid = handle.match(/<@!?(\d+)>/)[1];
        const user = await interaction.client.users.fetch(uid);
        handleText = user ? user.username : handle;
    } else if (/<@&(\d+)>/.test(handle)) {
        let roleId = handle.match(/<@&(\d+)>/)[1];
        const role = await interaction.guild.roles.fetch(roleId);
        handleText = role ? role.name : handle;
    }

    const imgRegex = /^image\/(png|jpe?g)$/;

    if (!imgRegex.test(screenshot.contentType)) {
        await interaction.editReply({ content: 'Please upload a valid image (PNG, JPG, JPEG).', flags: MessageFlags.Ephemeral });
        return;
    }

    if (!sport || !Object.keys(sports).includes(sport)) {
        await interaction.editReply({ content: 'Invalid sport selected.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (!handle || typeof handle !== 'string' || handle.trim() === '' || handle.trim().length > 50) {
        await interaction.editReply({ content: 'Please provide a valid handle.', flags: MessageFlags.Ephemeral });
        return;
    }

    try {
        const logoURL = `./assets/logo/${sport}.png`;
        const screenshotURL = screenshot.url;

        const watermarkBuffer = await createWatermark(screenshotURL, logoURL, handleText);
        const fileName = `watermarked-${Date.now()}.jpg`;
        const attachment = new AttachmentBuilder(watermarkBuffer, { name: fileName });

        const sportObj = sports[sport];
        const contentToSend = `${interaction.user} | \`${interaction.user.id}\` | \`${sportObj.name}\``;

        if (win) {
            try {
                const winChannel = interaction.client.channels.cache.get(winChannels.approvalChannel);
                if (winChannel) {
                    await winChannel.send({ content: contentToSend, files: [attachment], components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('win-approve')
                                .setLabel('Approve')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId('win-deny')
                                .setLabel('Deny')
                                .setStyle(ButtonStyle.Danger)
                        )
                    ] });
                }
            } catch (error) {
                console.error('Error sending message to win channel:', error);
            }
        } else {
            try {
                const publicChannel = interaction.client.channels.cache.get(sportObj.publicChannel);
                if (publicChannel) {
                    await publicChannel.send({ content: contentToSend, files: [attachment] });
                }
            } catch (error) {
                console.error('Error sending message to public channel:', error);
            }

            try {
                const modChannel = interaction.client.channels.cache.get(modChannelID);
                if (modChannel) {
                    await modChannel.send({ content: contentToSend, files: [attachment] });
                }
            } catch (error) {
                console.error('Error sending message to mod channel:', error);
            }
        }

        if(ourpick){
            try {
                const ourPickChannel = interaction.client.channels.cache.get(ourPickChannelID);
                if (ourPickChannel) {
                    await ourPickChannel.send({ content: contentToSend, files: [attachment] });
                }
            } catch (error) {
                console.error('Error sending message to our pick channel:', error);
            }
        }

        await interaction.editReply({ content: 'Screenshot uploaded!', files: [attachment] });
    } catch (error) {
        console.error('Error uploading screenshot:', error);
        await interaction.editReply({ content: 'Failed to upload screenshot.', flags: MessageFlags.Ephemeral });
    }
}
