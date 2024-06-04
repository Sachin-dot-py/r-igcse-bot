import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { HostSession } from "@/mongo/schemas/HostSession"
import { ButtonInteractionCache, GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, ModalBuilder, SlashCommandBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import BaseCommand, {
    type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import { v4 as uuidv4 } from "uuid";
import Select from "@/components/Select";
import Buttons from "@/components/practice/views/Buttons";
import parse from "parse-duration";
import humanizeDuration from "humanize-duration";
import UserSelect from "@/components/practice/UserSelect";

export default class HostSessionCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("host_study_event")
                .setDescription("Schedule a study session you want to host")
                .setDMPermission(false)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">
    ) {

        if (!interaction.guild.features.includes('COMMUNITY')) {
            interaction.reply({
                content: "Host sessions may only be used in community servers",
                ephemeral: true
            });

            return;
        }

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
            .setLabel("Start Time (Epoch)")
            .setPlaceholder("The time when the session will start at (epoch)")
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

        const startTimeString = modalInteraction.fields.getTextInputValue("start-time");
        const startDate = Math.round((parseInt(startTimeString) / 1800)) * 1800; // Rounded off to 30 mins

        if (isNaN(startDate)) {
            modalInteraction.reply({
                content: "Ensure you entered a valid epoch timestamp",
                ephemeral: true
            })

            return;
        }

        if (startDate - (Date.now() / 1000) < 3600) {
            modalInteraction.reply({
                content: "Session can't be hosted before an hour.",
                ephemeral: true
            });

            return;
        }

        if (startDate.toString().length !== 10) {
            modalInteraction.reply({
                content: "Ensure you enter a valid starting time (epoch in seconds)",
                ephemeral: true
            });

            return;
        }

        const durationString =
            modalInteraction.fields.getTextInputValue("duration");
        const duration = /^\d+$/.test(durationString) ? parseInt(durationString) * 60 * 1000 : parse(durationString, "ms") ?? 0;

        if (duration > 43_200_000 || duration < 900_000 || isNaN(duration)) {
            modalInteraction.reply({
                content: "Ensure you enter a valid duration",
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

        await interaction.guild.members.fetch()
        const subjectHelpers = (await interaction.guild.roles.fetch(response[0]))?.members.filter((helper) => helper.id !== interaction.user.id);

        let userResponse;
        let userSelectInteraction;

        if (subjectHelpers && subjectHelpers?.size > 0) {
            await modalInteraction.editReply({
                content: "Select any co-hosts (leave empty for none)",
                components: []
            });

            const userSelectCustomId = uuidv4();

            const userSelect = new UserSelect(
                userSelectCustomId,
                "Select helpers that will host alongside you (leave empty for none)",
                25,
                userSelectCustomId
            );

            userSelectInteraction = await modalInteraction.editReply({
                content: "Select co-hosts (leave empty for none)",
                components: [
                    new ActionRowBuilder<UserSelect>().addComponents(userSelect),
                    new Buttons(userSelectCustomId) as ActionRowBuilder<ButtonBuilder>
                ]
            });

            userResponse = await userSelect.waitForResponse(
                userSelectCustomId,
                userSelectInteraction,
                modalInteraction,
                true
            );

            if (userResponse) {
                for (const user of userResponse) {
                    if (!Array.from(subjectHelpers.keys()).includes(user)) {
                        modalInteraction.editReply({
                            content: "Users selected must also be helpers of the subject"
                        });

                        return;
                    }
                }
            }
        }

        const teachers = userResponse
            ? [interaction.user.id, ...userResponse]
            : [interaction.user.id];

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
            content: "Session to be hosted sent for approval",
            components: []
        });

    }

    async startSession(client: DiscordClient<true>) {

        const sessions = await HostSession.find({
            startDate: { $lte: Date.now() / 1000 },
            accepted: true,
            scheduled: false
        });

        for (const session of sessions) {
            const guildPreferences = await GuildPreferencesCache.get(session.guildId);
            if (!guildPreferences || !guildPreferences.hostSessionChannelId) continue;

            const sessionGuild = client.guilds.cache.get(session.guildId);
            if (!sessionGuild) continue;

            const studyChannel = await StudyChannel.findOne({
                studyPingRoleId: session.studyPingRoleId
            });
            if (!studyChannel) continue;

            if (!session.channelId) continue;

            const sessionChannel = sessionGuild.channels.cache.get(session.channelId);

            if (!sessionChannel || sessionChannel.type !== ChannelType.GuildStageVoice) continue;

            sessionChannel.permissionOverwrites.delete(sessionGuild.roles.everyone.id);

            const sessionAnnouncementChannel = sessionGuild.channels.cache.get(guildPreferences.hostSessionChannelId);

            if (!sessionAnnouncementChannel || !sessionAnnouncementChannel.isTextBased()) continue;

            const teachers = session.teachers;

            let acceptedSessionMessage =
                `<@&${session.studyPingRoleId}>, the study session hosted by `;

            for (const teacherId of teachers) {
                acceptedSessionMessage += `<@${teacherId}> `;
            }

            if (!session.scheduledEventId) continue;

            const event = sessionGuild.scheduledEvents.cache.get(session.scheduledEventId);

            if (!event) return;

            const eventLink = await event.createInviteURL()

            acceptedSessionMessage += `is starting now! It will last ${humanizeDuration((session.endDate - session.startDate) * 1000, { largest: 2 })}\nThe following topics will be covered: ${session.contents}\n\n${eventLink}`;

            await sessionAnnouncementChannel.send({
                content: acceptedSessionMessage
            });

            await session.updateOne({ scheduled: true });
        }
    }
}

