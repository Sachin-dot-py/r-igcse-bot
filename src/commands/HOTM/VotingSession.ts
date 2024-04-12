import { HOTM, HOTMUser, GuildPreferences } from "@/mongo";
import { HOTMSessions } from "@/mongo/schemas/HOTMSessions";
import type { DiscordClient } from "@/registry/DiscordClient";
import BaseCommand, {
    type DiscordChatInputCommandInteraction
} from "@/registry/Structure/BaseCommand";
import { EmbedBuilder, Guild, PermissionFlagsBits, SlashCommandBuilder, TextChannel, type APIEmbedField } from "discord.js";

export default class HOTMSessionCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("hotm_session")
                .setDescription(
                    "Modify a voting session for Helper Of The Month (for mods)"
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("start")
                        .setDescription("Start a new voting session for Helper Of The Month")
                        .addNumberOption((option) =>
                            option
                                .setName("duration")
                                .setDescription("Duration of the voting session (days)") // Seconds for testing purposes
                                .setMinValue(1)
                                .setRequired(true)
                        )
                        .addNumberOption(option =>
                            option
                                .setName("start_time")
                                .setDescription("Time until the voting session starts (days)") // Seconds for testing purposes
                                .setRequired(false)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("modify")
                        .setDescription("Modify an ongoing voting session")
                        .addNumberOption((option) =>
                            option
                                .setName("start_time")
                                .setDescription("Change when the voting session starts (days)")
                                .setMinValue(0)
                                .setRequired(false)
                        )
                        .addNumberOption((option) =>
                            option
                                .setName("duration")
                                .setDescription("Change how long the voting session will last (days)")
                                .setMinValue(1)
                                .setRequired(false)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("end")
                        .setDescription("End the current voting session")
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .setDMPermission(false)
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">
    ) {
        const session = await HOTMSessions.findOne({ guildId: interaction.guildId });

        let message;

        const startTime = interaction.options.getNumber("start_time") ?? -1;
        const duration = interaction.options.getNumber("duration") ?? 0;

        let startDate = Date.now() + (startTime * 24 * 60 * 60 * 1000);
        startDate -= startDate % 3600000; // Round down to nearest hour
        let endDate = startDate + (duration * 24 * 60 * 60 * 1000);

        const guildPreferences = await GuildPreferences.findOne({ guildId: interaction.guildId });

        if (!guildPreferences) {
            interaction.reply({
                content: "Configure the bot using `/setup` before starting sessions"
            });
            return;
        }

        switch (interaction.options.getSubcommand()) {
            case ("start"):
                if (session) {
                    interaction.reply({
                        content: "There is already an ongoing voting session, modify it using `/hotm_session modify` instead",
                        ephemeral: true
                    });
                    return;
                }

                await interaction.deferReply({
                    ephemeral: true
                });
                await HOTMSessions.create(
                    {
                        guildId: interaction.guildId,
                        startDate: startDate,
                        endDate: endDate
                    }
                );
                interaction.editReply({
                    content: `Starting a new voting session on <t:${(startDate / 1000).toFixed(0)}>, it will end on <t:${(endDate / 1000).toFixed(0)}>`
                });
                break;

            case ("modify"):

                if (!session) {
                    interaction.reply({
                        content: "There is no voting session to modify, create one using `/hotm_session start`",
                        ephemeral: true
                    });
                    return;
                }

                if (startTime === -1 && duration === 0) {
                    interaction.reply({
                        content: "Ensure you have entered a valid duration and/or start time",
                        ephemeral: true
                    })
                    return;
                }

                if (session.startDate < Date.now() && startTime > 0) {
                    interaction.reply({
                        content: "You may not change an ongoing session's start time",
                        ephemeral: true
                    });
                    return;
                }

                if (duration > 0 && endDate <= Date.now()) {
                    interaction.reply({
                        content: "This duration would end the session, do that using `/hotm_session end` instead",
                        ephemeral: true
                    });
                    return;
                }

                await interaction.deferReply({
                    ephemeral: true
                });

                if (startTime >= 0) {
                    if (duration == 0) endDate = startDate + (session.endDate - session.startDate);

                    await session.updateOne({
                        startDate: startDate,
                        endDate: endDate
                    });
                    message =
                        `Successfully updated the voting session, it will start on <t:${(startDate / 1000).toFixed(0)}>, and end on <t:${(endDate / 1000).toFixed(0)}>`;
                } else {
                    await session.updateOne({
                        endDate: endDate
                    });
                    message =
                        `Successfully updated the voting session, it will end on <t:${(endDate / 1000).toFixed(0)}>`;
                }

                interaction.editReply({
                    content: message
                })

                break;

            case ("end"):

                if (!session) {
                    interaction.reply({
                        content: "There is no voting session to end",
                        ephemeral: true
                    });
                    return;
                }

                await interaction.deferReply({ ephemeral: true });

                await session.updateOne(
                    { endDate: Date.now() }
                );
                await this.endSession(client, interaction.guildId);

                interaction.editReply("Session ended");

                await HOTM.deleteMany({ guildId: interaction.guildId });
                await HOTMUser.deleteMany({ guildId: interaction.guildId });
                await GuildPreferences.updateOne(
                    {
                        guildId: interaction.guildId
                    },
                    {
                        hotmResultsEmbedId: null
                    }
                );

                break;
        }
    }

    async endSession(client: DiscordClient<true>, guildId: string | null = null) {

        const votingSessions = guildId
            ? await HOTMSessions.find({
                guildId: guildId,
                endDate: { $lte: Date.now() }
            })
            : await HOTMSessions.find({
                endDate: { $lte: Date.now() }
            });

        for (const session of votingSessions) {

            const guildPreferences = await GuildPreferences.findOne({ guildId: session.guildId });

            if (!guildPreferences?.hotmResultsChannelId) continue;

            if (Date.now() >= session.endDate) {
                await this.handleEmbed(client.guilds.cache.get(session.guildId),
                    guildPreferences.hotmResultsEmbedId,
                    guildPreferences.hotmResultsChannelId,
                    "***Session ended***")
                await GuildPreferences.updateOne(
                    { guildId: session.guildId },
                    { hotmResultsEmbedId: undefined },
                    { upsert: true }
                );

                await session.deleteOne();
                await HOTM.deleteMany({ guildId: session.guildId });
                await HOTMUser.deleteMany({ guildId: session.guildId });
                continue;
            }
        }
    }

    async handleEmbed(
        guild: Guild | undefined,
        messageId: string | undefined,
        channelId: string,
        message: string | undefined = undefined
    ) {
        if (!guild) return;

        const resultsChannel = guild.channels.cache.get(channelId);
        if (!resultsChannel || !(resultsChannel instanceof TextChannel)) return;

        const results = await HOTM.find({ guildId: guild.id })
            .sort({ votes: -1 })
            .limit(20)
            .exec();

        const fields: APIEmbedField[] = [];

        for (const helper of results) {
            const user = await guild.members
                .fetch(helper.helperId)
                .catch(() => null);
            fields.push({
                name: user ? `${user.user.tag} (${user.id})` : helper.helperId,
                value: `Votes: ${helper.votes}`
            });
        }
        const embed = new EmbedBuilder()
            .setDescription(message ?? null)
            .setTitle("HOTM Results")
            .setTimestamp()
            .addFields(...fields)

        const oldEmbedMessage = messageId
            ? await resultsChannel.messages.fetch(messageId).catch(() => null)
            : null;

        await oldEmbedMessage?.delete();

        const embedMessage = await resultsChannel.send({
            embeds: [embed]
        });
        await GuildPreferences.updateOne(
            {
                guildId: guild.id
            },
            {
                hotmResultsEmbedId: embedMessage.id
            }
        );
        return;
    }
}