import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { HostSession } from "@/mongo/schemas/HostSession"
import { ButtonInteractionCache, GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, SlashCommandBuilder, StageChannel, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import BaseCommand, {
    type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import { v4 as uuidv4 } from "uuid";
import Select from "@/components/Select";
import Buttons from "@/components/practice/views/Buttons";
import parse from "parse-duration";
import humanizeDuration from "humanize-duration";

export default class HostSessionCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("host_session")
                .setDescription("Schedule a study session you want to host")
                .setDMPermission(false)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">
    ) {

        const guildPreferences = await GuildPreferencesCache.get(
            interaction.guildId
        );

        if (!guildPreferences || !guildPreferences.hostSessionChannelId || !guildPreferences.hostSessionApprovalChannelId) {
            await interaction.reply({
                content:
                    "This guild hasn't configured session hosting. Please contact an admistrator (`/setup`)",
                ephemeral: true
            });

            return;
        }

        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (!member) return;

        const hostSessionChannel = interaction.guild.channels.cache.get(
            guildPreferences.hostSessionChannelId
        );

        if (!hostSessionChannel) {
            await interaction.reply({
                content:
                    "The Session Hosting Announcement Channel couldn't be found. Please contact an admin.",
                ephemeral: true
            });

            return;
        }

        if (!hostSessionChannel.isTextBased()) {
            await interaction.reply({
                content:
                    "The Session Hosting Announcement Channel is of an invalid type. Please contact an admin.",
                ephemeral: true
            });

            return;
        }

        const approvalChannel = interaction.guild.channels.cache.get(guildPreferences.hostSessionApprovalChannelId);

        if (!approvalChannel) {
            await interaction.reply({
                content:
                    "The Session Hosting Approval Channel couldn't be found. Please contact an admin.",
                ephemeral: true
            });

            return;
        }

        if (!approvalChannel.isTextBased()) {
            await interaction.reply({
                content:
                    "The Session Hosting Approval Channel is of an invalid type. Please contact an admin.",
                ephemeral: true
            });

            return;
        }

        const studyChannels = await StudyChannel.find({
            guildId: interaction.guild.id
        });

        const helperRoles = interaction.guild.roles.cache.filter((role) =>
            studyChannels
                .map((studyChannel) => studyChannel.helperRoleId)
                .some((helperRoleId) => helperRoleId === role.id)
        );

        const userHelperRoles = helperRoles.filter((role) => role.members.has(interaction.user.id));

        if (userHelperRoles.size <= 0) {
            interaction.reply({
                content: "Only helpers can host a session",
                ephemeral: true
            });

            return;
        }

        const startTimeInput = new TextInputBuilder()
            .setCustomId("start-time")
            .setLabel("Start Time")
            .setPlaceholder("The time from now the session will start at")
            .setRequired(true)
            .setStyle(TextInputStyle.Short);

        const durationInput = new TextInputBuilder()
            .setCustomId("duration")
            .setLabel("Duration")
            .setPlaceholder("The time you expect your study session to last")
            .setRequired(true)
            .setStyle(TextInputStyle.Short);

        const contentInput = new TextInputBuilder()
            .setCustomId("contents")
            .setLabel("Contents (seperate with ,)")
            .setPlaceholder("The content you will go over during your session")
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph);

        const actionRows = [
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                startTimeInput
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                durationInput
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                contentInput
            )
        ];

        const modalCustomId = uuidv4();

        const modal = new ModalBuilder()
            .setCustomId(modalCustomId)
            .addComponents(...actionRows)
            .setTitle("Session Hosting!");

        await interaction.showModal(modal);

        const modalInteraction = await interaction.awaitModalSubmit({
            time: 600_000,
            filter: (i) => i.customId === modalCustomId
        });

        const startTimeString =
            modalInteraction.fields.getTextInputValue("start-time");
        const startTime = /^\d+$/.test(startTimeString) ? parseInt(startTimeString) : parse(startTimeString, "ms") ?? 0;

        if (startTime < 3600000) {
            modalInteraction.reply({
                content: "Session can't be hosted that soon.",
                ephemeral: true
            });
            return;
        }

        const durationString =
            modalInteraction.fields.getTextInputValue("duration");
        const duration = /^\d+$/.test(durationString) ? parseInt(durationString) * 60 * 1000 : parse(durationString, "ms") ?? 0;

        if (duration > 43200000) {
            modalInteraction.reply({
                content: "Session can't be hosted for that long.",
                ephemeral: true
            });
            return;
        }

        const selectCustomId = uuidv4();

        const subjectSelect = new Select(
            "team",
            "Select a subject to host a session for",
            userHelperRoles.map((role) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(interaction.guild.roles.cache.find((roles) => roles.id === role.id)?.name ?? "Unknown")
                    .setValue(role.id)
            ),
            1,
            `${selectCustomId}_0`
        );

        const selectInteraction = await modalInteraction.reply({
            content: "Select a subject to host a session for",
            components: [
                new ActionRowBuilder<Select>().addComponents(subjectSelect),
                new Buttons(selectCustomId) as ActionRowBuilder<ButtonBuilder>
            ],
            fetchReply: true,
            ephemeral: true
        });

        const response = await subjectSelect.waitForResponse(
            `${selectCustomId}_0`,
            selectInteraction,
            modalInteraction,
            true
        );

        if (!response || response === "Timed out" || !response[0]) {
            await modalInteraction.followUp({
                content: "An error occurred",
                ephemeral: false
            });
            return;
        }

        const studyChannelData = await StudyChannel.findOne({
            helperRoleId: response[0]
        });

        if (!studyChannelData) {
            await modalInteraction.followUp({
                content:
                    "Couldn't find study channel data. Please contact an admin.",
                ephemeral: true
            });

            return;
        }

        const pingRole = interaction.guild.roles.cache.get(
            studyChannelData.studyPingRoleId
        );

        if (!pingRole) {
            await modalInteraction.followUp({
                content:
                    "The Study Ping Role couldn't be found. Please contact an admin.",
                ephemeral: true
            });

            return;
        }

        const subjectHelpers = interaction.guild.roles.cache.get(response[0])?.members.filter((helper) => helper.id !== interaction.user.id);

        let userResponse;
        let userSelectInteraction;

        if (subjectHelpers && subjectHelpers?.size > 0) {

            modalInteraction.editReply({
                content: "Choose any co-hosts",
                components: []
            });

            const userSelectCustomId = uuidv4();

            const userSelect = new Select(
                "helpers",
                "Select helpers that will host alongside you",
                subjectHelpers.map((helper) =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${helper.displayName} (${helper.user.tag})`)
                        .setValue(helper.user.id)
                ),
                1,
                `${userSelectCustomId}_0`
            ).setMaxValues(subjectHelpers.size);

            userSelectInteraction = await modalInteraction.followUp({
                content: "Select co-hosts",
                components: [
                    new ActionRowBuilder<Select>().addComponents(userSelect),
                    new Buttons(userSelectCustomId) as ActionRowBuilder<ButtonBuilder>
                ],
                fetchReply: true,
                ephemeral: true
            });

            userResponse = await userSelect.waitForResponse(
                `${userSelectCustomId}_0`,
                userSelectInteraction,
                modalInteraction,
                true
            );

            if (!userResponse || userResponse === "Timed out" || !userResponse[0]) {
                await modalInteraction.followUp({
                    content: "An error occurred",
                    ephemeral: false
                });
                return;
            }
        }

        const teachers = userResponse
            ? [interaction.user.id, ...userResponse]
            : [interaction.user.id];

        const startDate = Math.round((Math.round((Date.now() + startTime) / 1000)) / 1800) * 1800; // Rounded off
        const endDate = startDate + Math.round(duration / 1000);

        const contentsArray = modalInteraction.fields.getTextInputValue("contents").split(",")
        let contents = "";

        for (const content of contentsArray) {
            contents += `\n- ${content}`;
        }

        let embedDescription = `Session Hosted for <#${studyChannelData.channelId}> by:`;

        for (const teacher of teachers) {
            embedDescription += `\n<@${teacher}> (${teacher})`;
        }

        embedDescription +=
            `\n\nThey will cover the following topics: ${contents}\n\nStart: <t:${startDate}:R> at <t:${startDate}:t>\nEnd: <t:${endDate}:R> at <t:${endDate}:t>\nTotal Duration: ${humanizeDuration(duration)}`;

        const embed = new EmbedBuilder()
            .setTitle(
                `Session Requested To Be Hosted`
            )
            .setDescription(embedDescription)
            .setColor("Random")
            .setAuthor({
                name: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
            });

        const buttonCustomId = uuidv4();

        const approveButton = new ButtonBuilder()
            .setLabel("Approve")
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`${buttonCustomId}_host_session_accept`);

        const rejectButton = new ButtonBuilder()
            .setLabel("Reject")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`${buttonCustomId}_host_session_reject`);

        const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                approveButton,
                rejectButton
            );

        const message = await approvalChannel.send({
            embeds: [embed],
            components: [buttonsRow]
        });

        await HostSession.create({
            guildId: interaction.guildId,
            teachers,
            studyPingRoleId: pingRole.id,
            startDate,
            endDate,
            accepted: false,
            messageId: message.id,
            contents
        })

        await ButtonInteractionCache.set(`${buttonCustomId}_host_session`, {
            customId: `${buttonCustomId}_host_session`,
            messageId: message.id,
            guildId: interaction.guild.id,
            userId: interaction.user.id
        });

        ButtonInteractionCache.expire(
            `${buttonCustomId}_host_session`,
            3 * 24 * 60 * 60
        ); // 3 days
        // Interaction will be handled in the InteractionCreate event and is stored in redis (@/events/InteractionCreate.ts)

        await modalInteraction.editReply({
            content: "Session to be hosted sent for approval.",
            components: []
        })

        await userSelectInteraction?.delete();

    }

    async startSession(client: DiscordClient<true>) {

        const sessions = await HostSession.find({
            startDate: { $lte: Date.now() / 1000 },
            accepted: true
        });

        if (sessions.length > 0) console.log(`HELO ${sessions}`);

        for (const session of sessions) {
            const guildPreferences = await GuildPreferencesCache.get(session.guildId);

            if (!guildPreferences || !guildPreferences.hostSessionChannelId || !guildPreferences.studySessionChannelId) return;

            const sessionGuild = client.guilds.cache.get(session.guildId);

            if (!sessionGuild) return;

            const sessionChannel = sessionGuild.channels.cache.get(guildPreferences.studySessionChannelId);

            if (!sessionChannel) return;

            const studyChannel = await StudyChannel.findOne({
                studyPingRoleId: session.studyPingRoleId
            });

            if (!studyChannel) return;

            const subjectChannel = sessionGuild.channels.cache.get(studyChannel.channelId);

            if (!subjectChannel || !(subjectChannel instanceof StageChannel)) return;

            sessionChannel.setName(`${subjectChannel.name} hosted study session`);

            const sessionAnnouncementChannel = sessionGuild.channels.cache.get(guildPreferences.hostSessionChannelId);

            if (!sessionAnnouncementChannel || !sessionAnnouncementChannel.isTextBased()) return;

            const teachers = session.teachers;

            let acceptedSessionMessage =
                `<@&${session.studyPingRoleId}>, the study session hosted by `;

            for (const teacherId of teachers) {
                acceptedSessionMessage += `<@${teacherId}> `;
            }

            acceptedSessionMessage += `is starting now! It will last ${humanizeDuration((session.endDate - session.startDate) * 1000)}\nThe following topics will be covered: ${session.contents}`;

            await sessionAnnouncementChannel.send({
                content: acceptedSessionMessage
            });

            await session.deleteOne();
        }
    }
}

