import type { DiscordClient } from "@/registry/DiscordClient";
import {
    ForumChannel,
    SlashCommandBuilder,
} from "discord.js";
import BaseCommand, {
    type DiscordChatInputCommandInteraction
} from "../../registry/Structure/BaseCommand";
import {PrivateDmThread} from "@/mongo";
import {GuildPreferencesCache} from "@/redis";

export default class DMUserCommand extends BaseCommand {
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("dm_user")
                .setDescription("Create a modmail thread for a user (for mods)")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("User to DM")
                        .setRequired(true),
                )
        );
    }

    async execute(
        client: DiscordClient<true>,
        interaction: DiscordChatInputCommandInteraction<"cached">
    ) {
        const guildPreferences = await GuildPreferencesCache.get(
            interaction.guildId
        );

        if (!guildPreferences ||
            !guildPreferences.modmailThreadsChannelId ||
            !guildPreferences.modmailCreateChannelId
        ) {
            await interaction.reply({
                content: "Modmail is not set up in this server.",
                ephemeral: true
            });
            return;
        }

        const member = interaction.options.getMember("user");

        if (!member) {
            await interaction.reply({
                content: "User not found.",
            });
            return;
        }

        const res = await PrivateDmThread.findOne({
            userId: member.id,
            guildId: interaction.guild.id,
        });

        if (res) {
            const thread = await interaction.guild.channels
                .fetch(res.threadId)
                .catch(async () => {
                    await PrivateDmThread.deleteMany({
                        userId: member.id,
                        guildId: interaction.guild.id,
                    });
                    await interaction.reply({
                        content: "Thread not found (could've been manually deleted), please try again to create a new thread.",
                        ephemeral: true
                    });
                    return;
                });

            if (thread) {
                await interaction.reply(
                    `DM Thread with this user already exists: <#${thread.id}>`,
                );

                return;
            }
        }

        const threadsChannel = interaction.guild.channels.cache.get(
            guildPreferences.modmailThreadsChannelId,
        );

        if (
            !threadsChannel ||
            !(threadsChannel instanceof ForumChannel)
        ) {
            await interaction.reply({
                content: `Threads channel (${threadsChannel}) should be a forum channel.`,
                ephemeral: true
            });
            return;
        }

        try {
            const newThread = await threadsChannel.threads.create({
                name: `${member.user.tag} (${member.id})`,
                message: {
                    content: `Username: \`${member.user.tag}\`\nUser ID: \`${member.id}\``,
                },
            });

            await PrivateDmThread.create({
                userId: member.id,
                threadId: newThread.id,
                guildId: interaction.guild.id,
            });

            await interaction.reply(
                `Created dm thread for user at <#${newThread.id}>.`,
            );
        } catch (error) {
            await interaction.reply({
                content: "Unable to create thread",
                ephemeral: true
            });

            client.log(
                error,
                `Create DM Thread`,
                `**Channel:** <#${interaction.channel?.id}>
							**User:** <@${interaction.user.id}>
							**Guild:** ${interaction.guild.name} (${interaction.guildId})\n`,
            );
        }
    }
}