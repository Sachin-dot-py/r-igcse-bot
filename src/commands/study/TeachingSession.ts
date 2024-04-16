import { StudyChannel } from "@/mongo/schemas/StudyChannel";
import { TeachingSession } from "@/mongo/schemas/TeachingSession"
import { ButtonInteractionCache, GuildPreferencesCache } from "@/redis";
import type { DiscordClient } from "@/registry/DiscordClient";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import BaseCommand, {
    type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import { v4 as uuidv4 } from "uuid";
import Select from "@/components/Select";
import Buttons from "@/components/practice/views/Buttons";
import parse from "parse-duration";

export default class TeachingSessionCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("teaching_session")
                .setDescription("Schedule a teaching session")
                .addStringOption((option) =>
                    option
                        .setName("start_time")
                        .setDescription("The time until your teaching session starts")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("duration")
                        .setDescription("The duration you expect your teaching session to last")
                        .setRequired(true)
                )
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

        if (!guildPreferences || !guildPreferences.teachingSessionChannelId || !guildPreferences.teachingSessionApprovalChannelId) {
            await interaction.reply({
                content:
                    "This guild hasn't configured teaching sessions. Please contact an admistrator (`/setup`)",
                ephemeral: true
            });

            return;
        }

        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (!member) return;

        const teachingSessionChannel = interaction.guild.channels.cache.get(
            guildPreferences.teachingSessionChannelId
        );

        if (!teachingSessionChannel) {
            await interaction.reply({
                content:
                    "The Teaching Session Channel couldn't be found. Please contact an admin.",
                ephemeral: true
            });

            return;
        }

        if (!teachingSessionChannel.isTextBased()) {
            await interaction.reply({
                content:
                    "The Teaching Session Channel is of an invalid type. Please contact an admin.",
                ephemeral: true
            });

            return;
        }

        const approvalChannel = interaction.guild.channels.cache.get(guildPreferences.teachingSessionApprovalChannelId);

        if (!approvalChannel) {
            await interaction.reply({
                content:
                    "The Teaching Session Approval Channel couldn't be found. Please contact an admin.",
                ephemeral: true
            });

            return;
        }

        if (!approvalChannel.isTextBased()) {
            await interaction.reply({
                content:
                    "The Teaching Session Approval Channel is of an invalid type. Please contact an admin.",
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
                content: "Only helpers can start a teaching session",
                ephemeral: true
            });

            return;
        }

        const startTimeString = interaction.options.getString("start_time", true);
        const startTime = /^\d+$/.test(startTimeString) ? parseInt(startTimeString) : parse(startTimeString, "second") ?? 0;

        if (startTime < 1800) {
            interaction.reply({
                content: "Teaching session can't be held that soon.",
                ephemeral: true
            });
            return;
        }

        const durationString = interaction.options.getString("duration", true);
        const duration = /^\d+$/.test(durationString) ? parseInt(durationString) : parse(durationString, "second") ?? 0;

        const selectCustomId = uuidv4();

        const subjectSelect = new Select(
            "team",
            "Select a subject to schedule a teaching session for",
            userHelperRoles.map((role) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(interaction.guild.roles.cache.find((roles) => roles.id === role.id)?.name ?? "Unknown")
                    .setValue(role.id)
            ),
            1,
            `${selectCustomId}_0`
        );

        const selectInteraction = await interaction.reply({
            content: "Select a subject to schedule a teaching session for",
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
            interaction,
            true
        );

        if (!response || response === "Timed out" || !response[0]) {
            await interaction.followUp({
                content: "An error occurred",
                ephemeral: false
            });
            return;
        }

        const studyChannelData = await StudyChannel.findOne({
            helperRoleId: response[0]
        });

        if (!studyChannelData) {
            await interaction.followUp({
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
            await interaction.followUp({
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

            userSelectInteraction = await interaction.followUp({
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
                interaction,
                true
            );

            if (!userResponse || userResponse === "Timed out" || !userResponse[0]) {
                await interaction.followUp({
                    content: "An error occurred",
                    ephemeral: false
                });
                return;
            }
        }


        interaction.editReply({
            content: "Choose any co-hosts",
            components: []
        });

        const teachers = userResponse
            ? [interaction.user.id, ...userResponse]
            : [interaction.user.id];

        const startDate = new Date(Date.now() + startTime);
        const endDate = new Date(Date.now() + startTime + duration);

        let embedDescription = `Teaching session for <#${studyChannelData.channelId}> by:`;

        for (const teacher of teachers) {
            embedDescription += `\n<@${teacher}> (${teacher})`;
        }

        const embed = new EmbedBuilder()
            .setTitle(
                `Teaching Session Requested`
            )
            .setDescription(embedDescription)
            .setFooter({
                text: `Start: ${startDate.toDateString()} at ${startDate.toLocaleTimeString()}\nEnd: ${endDate.toDateString()} at ${endDate.toLocaleTimeString()}\n`
            })
            .setColor("Random")
            .setAuthor({
                name: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
            });

        const buttonCustomId = uuidv4();

        const approveButton = new ButtonBuilder()
            .setLabel("Approve")
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`${buttonCustomId}_teaching_session_accept`);

        const rejectButton = new ButtonBuilder()
            .setLabel("Reject")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`${buttonCustomId}_teaching_session_reject`);

        const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                approveButton,
                rejectButton
            );

        const message = await approvalChannel.send({
            embeds: [embed],
            components: [buttonsRow]
        });

        await TeachingSession.create({
            guildId: interaction.guildId,
            teachers: teachers,
            studyPingRoleId: pingRole.id,
            startDate: Math.floor(startDate.getTime() / 1000),
            endDate: Math.floor(endDate.getTime() / 1000),
            accepted: false,
            messageId: message.id
        })

        await ButtonInteractionCache.set(`${buttonCustomId}_teaching_session`, {
            customId: `${buttonCustomId}_teaching_session`,
            messageId: message.id,
            guildId: interaction.guild.id,
            userId: interaction.user.id
        });

        ButtonInteractionCache.expire(
            `${buttonCustomId}_teaching_session`,
            3 * 24 * 60 * 60
        ); // 3 days
        // Interaction will be handled in the InteractionCreate event and is stored in redis (@/events/InteractionCreate.ts)

        await interaction.editReply({
            content: "Teaching session sent for approval.",
            components: []
        })

        await userSelectInteraction?.delete();

    }
}

